import { Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { googleSearchService } from '../services/googleSearchService';

const apiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('OPENAI_API_KEY is not configured');
}

if (!anthropicKey) {
  console.warn('ANTHROPIC_API_KEY is not configured (Fallback AI will not work)');
}

const anthropicModel = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022";
const anthropicMaxTokens = parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4000");

interface CompanyProfile {
  userId: string;
  name: string;
  logo?: string;
  industry?: string;
  founded?: string;
  headquarters?: string;
  overview: string;
  mission?: string;
  companyIntro?: string;
  culture: {
    values: string[];
    benefits: string[];
    workEnvironment: string;
  };
  opportunities: {
    roles: string[];
    growthPotential: string;
    training: string;
  };
  technology: {
    stack: string[];
    innovation: string;
  };
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  socialMedia: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

interface UniquenessCategory {
  title: string;
  icon: string;
  description: string;
  score: number;
  details: string[];
}

export class OpenAIController {
  async searchCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query is required',
        });
      }

      console.log(`🔍 [OpenAI] Proxied Google Search for: "${query}"`);
      const results = await googleSearchService.search(query);

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      console.error('❌ [OpenAI] Proxy search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform search',
        error: error.message,
      });
    }
  }

  async searchCompanyLogo(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('🔍 [OpenAI] Search Company Logo - Request:', {
        companyName: req.body.companyName,
        companyWebsite: req.body.companyWebsite
      });

      const { companyName, companyWebsite } = req.body;

      if (!apiKey) {
        console.error('❌ [OpenAI] API key not configured');
        return res.status(500).json({
          success: false,
          message: 'OpenAI API key is not configured',
        });
      }

      const openai = new OpenAI({
        apiKey,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [
          {
            role: "system",
            content: `You are a logo finder assistant. Based on the company name and website, provide the most likely URL for the company's logo. 
            Return only the direct URL to the logo image, or null if you cannot find a reliable logo URL.
            Common logo URL patterns:
            - https://company.com/logo.png
            - https://company.com/assets/logo.svg
            - https://company.com/images/logo.jpg
            - https://logo.clearbit.com/company.com (for Clearbit logo service)
            
            If no direct logo URL is available, use Clearbit's logo service: https://logo.clearbit.com/[domain]
            Return only the URL string, no explanations.`,
          },
          {
            role: "user",
            content: `Find the logo URL for company: ${companyName}${companyWebsite ? ` (Website: ${companyWebsite})` : ''}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      console.log('✅ [OpenAI] Logo search response received:', {
        usage: response.usage,
        model: response.model,
        choices: response.choices.length
      });

      const content = response.choices[0]?.message?.content;
      const logoUrl = content && !content.toLowerCase().includes('null') ? content.trim() : null;

      console.log('🎯 [OpenAI] Logo search result:', {
        rawContent: content,
        finalLogoUrl: logoUrl
      });

      res.status(200).json({
        success: true,
        data: { logoUrl },
      });
    } catch (error) {
      console.error("💥 [OpenAI] Logo search error:", error);
      next(error);
    }
  }

  private extractContactDataFromHtml(html: string, baseUrl?: string): {
    phones: string[];
    emails: string[];
    socialMedia: { linkedin?: string; twitter?: string; facebook?: string; instagram?: string; youtube?: string };
  } {
    const phones = new Set<string>();
    const emails = new Set<string>();
    const socialMedia: { linkedin?: string; twitter?: string; facebook?: string; instagram?: string; youtube?: string } = {};

    let originHost = '';
    try {
      if (baseUrl) originHost = new URL(baseUrl).hostname.replace(/^www\./, '');
    } catch { /* ignore */ }

    const telMatches = html.matchAll(/href=["']tel:([^"']+)["']/gi);
    for (const m of telMatches) {
      const cleaned = m[1].replace(/[^\d+]/g, '');
      if (cleaned.length >= 7) phones.add(this.normalizePhone(cleaned));
    }

    const phoneRegex = /(?:\+?\d{1,3}[\s.\-()]?)?(?:\(?\d{2,4}\)?[\s.\-]?){2,5}\d{2,4}/g;
    const phoneCandidates = html.match(phoneRegex) || [];
    for (const raw of phoneCandidates) {
      const digits = raw.replace(/[^\d+]/g, '');
      if (digits.length < 8 || digits.length > 16) continue;
      if (/^\d{4,8}$/.test(digits) && !raw.includes('+')) continue;
      phones.add(this.normalizePhone(digits.startsWith('+') ? digits : raw.trim()));
      if (phones.size >= 6) break;
    }

    const mailtoMatches = html.matchAll(/href=["']mailto:([^"'?]+)/gi);
    for (const m of mailtoMatches) emails.add(m[1].trim().toLowerCase());

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailCandidates = html.match(emailRegex) || [];
    for (const raw of emailCandidates) {
      const lower = raw.toLowerCase();
      if (/\.(png|jpe?g|gif|svg|webp|js|css|woff2?|ttf|otf)$/i.test(lower)) continue;
      if (lower.includes('@sentry') || lower.includes('@example.') || lower.includes('@wixpress')) continue;
      emails.add(lower);
      if (emails.size >= 5) break;
    }

    const findSocialUrl = (domain: RegExp): string | undefined => {
      const re = new RegExp(`https?:\\/\\/(?:[a-z0-9-]+\\.)?${domain.source}\\/[A-Za-z0-9._\\-/?=&%#]+`, 'gi');
      const matches = html.match(re);
      if (!matches) return undefined;
      const filtered = matches.filter((u) => {
        const low = u.toLowerCase();
        if (originHost && low.includes(`/${originHost}`)) return false;
        if (/\/(share|sharer|intent|status|hashtag)\b/.test(low)) return false;
        if (/(\.css|\.js|\.png|\.jpg|\.svg)(\?|#|$)/i.test(low)) return false;
        return true;
      });
      const ranked = filtered.sort((a, b) => a.length - b.length);
      return ranked[0]?.replace(/[)>\]"',.;]+$/, '');
    };

    socialMedia.linkedin = findSocialUrl(/linkedin\.com/);
    socialMedia.twitter = findSocialUrl(/(?:twitter|x)\.com/);
    socialMedia.facebook = findSocialUrl(/facebook\.com/);
    socialMedia.instagram = findSocialUrl(/instagram\.com/);
    socialMedia.youtube = findSocialUrl(/youtube\.com/);

    return {
      phones: Array.from(phones).slice(0, 6),
      emails: Array.from(emails).slice(0, 5),
      socialMedia,
    };
  }

  private normalizePhone(raw: string): string {
    const trimmed = raw.replace(/\s+/g, ' ').trim();
    return trimmed;
  }

  private extractTextFromHtml(html: string): { title: string; description: string; bodyText: string; ogImage?: string } {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const ogImage = ogImageMatch ? ogImageMatch[1].trim() : undefined;

    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    const bodyText = cleaned.slice(0, 6000);
    return { title, description, bodyText, ogImage };
  }

  async generateProfileFromUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { url, userId, logoUrl } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, message: 'A valid url is required' });
      }

      let normalizedUrl = url.trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      let parsed: URL;
      try {
        parsed = new URL(normalizedUrl);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid URL format' });
      }

      const fetchHtml = async (target: string): Promise<string> => {
        const response = await axios.get<string>(target, {
          timeout: 15000,
          maxContentLength: 5 * 1024 * 1024,
          responseType: 'text',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; HARXProfileBot/1.0; +https://harx.ai)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
          },
          validateStatus: (s) => s >= 200 && s < 400,
        });
        return typeof response.data === 'string' ? response.data : String(response.data ?? '');
      };

      console.log(`🌐 [Scrape] Fetching ${normalizedUrl}`);
      let html = '';
      try {
        html = await fetchHtml(normalizedUrl);
      } catch (err: any) {
        console.warn('⚠️ [Scrape] Failed:', err.message);
        return res.status(502).json({
          success: false,
          message: `Failed to fetch URL: ${err.message}`,
        });
      }

      const { title, description, bodyText, ogImage } = this.extractTextFromHtml(html);
      const contactData = this.extractContactDataFromHtml(html, normalizedUrl);

      const needsMoreContact =
        contactData.phones.length === 0 ||
        (!contactData.socialMedia.linkedin &&
          !contactData.socialMedia.twitter &&
          !contactData.socialMedia.facebook &&
          !contactData.socialMedia.instagram);

      if (needsMoreContact) {
        const candidatePaths = ['/contact', '/contact-us', '/contactez-nous', '/about', '/about-us', '/a-propos'];
        for (const path of candidatePaths) {
          try {
            const subUrl = new URL(path, normalizedUrl).toString();
            console.log(`🌐 [Scrape] Trying secondary ${subUrl}`);
            const subHtml = await fetchHtml(subUrl);
            const subContact = this.extractContactDataFromHtml(subHtml, normalizedUrl);
            for (const p of subContact.phones) if (!contactData.phones.includes(p)) contactData.phones.push(p);
            for (const e of subContact.emails) if (!contactData.emails.includes(e)) contactData.emails.push(e);
            for (const key of ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube'] as const) {
              if (!contactData.socialMedia[key] && subContact.socialMedia[key]) {
                contactData.socialMedia[key] = subContact.socialMedia[key];
              }
            }
            if (contactData.phones.length > 0 && contactData.socialMedia.linkedin) break;
          } catch {
            // ignore unreachable sub pages
          }
        }
      }
      const inferredLogo = logoUrl || ogImage || `https://logo.clearbit.com/${parsed.hostname}`;

      console.log('🔎 [Scrape] Extracted contact data:', {
        phones: contactData.phones,
        emails: contactData.emails,
        social: contactData.socialMedia,
      });

      const socialLines = Object.entries(contactData.socialMedia)
        .filter(([, v]) => Boolean(v))
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
        .join('\n');

      const companyInfo = [
        `Website: ${normalizedUrl}`,
        title ? `Page Title: ${title}` : '',
        description ? `Meta Description: ${description}` : '',
        contactData.phones.length ? `Detected Phone Numbers (use the first one as main): ${contactData.phones.join(', ')}` : '',
        contactData.emails.length ? `Detected Emails (use the most generic one — contact@, info@, hello@ — first): ${contactData.emails.join(', ')}` : '',
        socialLines ? `Detected Social Media URLs (use them as-is, do not invent):\n${socialLines}` : '',
        bodyText ? `Page Content: ${bodyText}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      req.body = {
        companyInfo,
        userId,
        logoUrl: inferredLogo,
        persist: false,
        _scrapedContact: contactData,
        _websiteUrl: normalizedUrl,
      };

      return this.generateCompanyProfile(req, res, next);
    } catch (error: any) {
      console.error('💥 [Scrape] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to scrape and generate profile', error: error.message });
    }
  }

  async generateCompanyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('🏢 [OpenAI] Generate Company Profile - Request:', {
        companyInfo: req.body.companyInfo?.substring(0, 100) + '...',
        userId: req.body.userId,
        logoUrl: req.body.logoUrl
      });

      const { companyInfo, userId, logoUrl, persist, _scrapedContact, _websiteUrl } = req.body;

      if (persist === true) {
        console.warn('⚠️ [AI] persist=true ignored — use POST /api/companies to save the company');
      }

      if (!apiKey) {
        console.error('❌ [OpenAI] API key not configured');
        return res.status(500).json({
          success: false,
          message: 'OpenAI API key is not configured',
        });
      }

      if (!companyInfo) {
        console.warn('⚠️ [OpenAI] Company information is required');
        return res.status(400).json({
          success: false,
          message: 'Company information is required',
        });
      }

      let profileData: any;
      let usedFallback = false;

      try {
        const openai = new OpenAI({ apiKey: apiKey! });
        const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a professional company profiler. Create a detailed company profile in JSON format based on the provided information. 
            The JSON response must include ALL of the following fields:
            {
              "name": "string",
              "industry": "string",
              "founded": "string (year)",
              "headquarters": "string (location)",
              "overview": "string (detailed company description)",
              "mission": "string (company mission statement)",
              "culture": {
                "values": ["array of at least 3 company values"],
                "benefits": ["array of at least 3 company benefits"],
                "workEnvironment": "string (detailed description)"
              },
              "opportunities": {
                "roles": ["array of at least 3 available roles"],
                "growthPotential": "string (detailed growth opportunities)",
                "training": "string (training and development details)"
              },
              "technology": {
                "stack": ["array of at least 3 technologies used"],
                "innovation": "string (innovation approach)"
              },
              "contact": {
                "website": "string (company website)",
                "email": "string (contact email)",
                "phone": "string (contact phone - search thoroughly for main business phone, customer service number, or headquarters phone. Include country code if available. Format as international number when possible)",
                "address": "string (complete physical address with street, city, state/province, postal code, country)"
              },
              "socialMedia": {
                "linkedin": "string (LinkedIn company page URL)",
                "twitter": "string (Twitter/X company handle URL)",
                "facebook": "string (Facebook company page URL - optional)",
                "instagram": "string (Instagram company account URL - optional)"
              }
            }
            
            IMPORTANT: For phone numbers, search extensively through the provided information including:
            - Main business phone numbers
            - Customer service numbers
            - Headquarters contact numbers
            - Support hotlines
            - Regional office numbers
            Always format phone numbers in international format when possible (e.g., +1-555-123-4567).
            
            If any information is not explicitly provided, make reasonable assumptions based on the company's industry and description.`,
          },
          {
            role: "user",
            content: `Generate a JSON company profile for: ${companyInfo}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("OpenAI returned empty content");
        profileData = JSON.parse(content);
        console.log('✅ [OpenAI] Profile generated successfully');
      } catch (error: any) {
        console.warn('⚠️ [OpenAI] Failed, falling back to Anthropic...', error.message);
        if (!anthropicKey) throw error;
        
        usedFallback = true;
        const anthropic = new Anthropic({ apiKey: anthropicKey });
        const anthropicResponse = await anthropic.messages.create({
          model: anthropicModel,
          max_tokens: anthropicMaxTokens,
          system: "You are a professional company profiler. Respond ONLY with a valid JSON object matching the requested schema.",
          messages: [{ role: "user", content: `Generate a JSON company profile for: ${companyInfo}` }],
        });

        const rawContent = anthropicResponse.content[0].type === 'text' ? anthropicResponse.content[0].text : '';
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        profileData = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
        console.log('✅ [Anthropic] Profile generated successfully (Fallback)');
      }

      console.log('🔍 [AI] Finalizing profile with data from provider...');

      console.log('📝 [AI] Skipping company intro generation for now, using default.');

      const scraped = _scrapedContact as
        | {
            phones: string[];
            emails: string[];
            socialMedia: { linkedin?: string; twitter?: string; facebook?: string; instagram?: string; youtube?: string };
          }
        | undefined;

      const pickEmail = (aiEmail?: string): string => {
        if (scraped?.emails?.length) {
          const generic = scraped.emails.find((e) =>
            /^(contact|info|hello|hi|sales|support|office|press|jobs)@/i.test(e)
          );
          return generic || scraped.emails[0];
        }
        return aiEmail || "";
      };

      const pickPhone = (aiPhone?: string): string => {
        if (scraped?.phones?.length) return scraped.phones[0];
        if (aiPhone && aiPhone !== "Téléphone non trouvé") return aiPhone;
        return "";
      };

      const pickSocial = (key: keyof NonNullable<typeof scraped>['socialMedia'], aiValue?: string): string => {
        const scrapedVal = scraped?.socialMedia?.[key];
        if (scrapedVal) return scrapedVal;
        return aiValue || "";
      };

      const finalProfile: CompanyProfile = {
        userId: userId || '681a91212c1ca099fe2b17df',
        companyIntro: "Généré par AI",
        ...profileData,
        logo: logoUrl || profileData.logo,
        culture: {
          values: profileData.culture?.values || [],
          benefits: profileData.culture?.benefits || [],
          workEnvironment: profileData.culture?.workEnvironment || "",
        },
        opportunities: {
          roles: profileData.opportunities?.roles || [],
          growthPotential: profileData.opportunities?.growthPotential || "",
          training: profileData.opportunities?.training || "",
        },
        technology: {
          stack: profileData.technology?.stack || [],
          innovation: profileData.technology?.innovation || "",
        },
        contact: {
          email: pickEmail(profileData.contact?.email),
          phone: pickPhone(profileData.contact?.phone),
          address: profileData.contact?.address || "",
          website: profileData.contact?.website || _websiteUrl || "",
        },
        socialMedia: {
          linkedin: pickSocial("linkedin", profileData.socialMedia?.linkedin),
          twitter: pickSocial("twitter", profileData.socialMedia?.twitter),
          facebook: pickSocial("facebook", profileData.socialMedia?.facebook),
          instagram: pickSocial("instagram", profileData.socialMedia?.instagram),
        },
      };

      // Preview only — persistence happens on POST /companies (Publish Company)
      res.status(200).json({
        success: true,
        data: finalProfile,
        provider: usedFallback ? 'anthropic' : 'openai'
      });
    } catch (error: any) {
      console.error("💥 [AI] Error:", error);
      res.status(500).json({ success: false, message: 'AI generation failed', error: error.message });
    }
  }

  async generateCompanyIntro(profile: CompanyProfile): Promise<string> {
    if (!apiKey) {
      return "Error: OpenAI API key is not configured";
    }

    const prompt = `\nWrite a compelling introduction for a \"Why Partner With Us?\" page for the company \"${profile.name}\".\nIndustry: ${profile.industry ?? 'N/A'}\nMission: ${profile.mission ?? 'N/A'}\nValues: ${(profile.culture?.values ?? []).join(', ') || 'N/A'}\nOpportunities: ${(profile.opportunities?.roles ?? []).join(', ') || 'N/A'}\n\nWrite exactly 3-4 lines (maximum 4 lines) highlighting innovation, growth, and unique opportunities. Use a modern and dynamic tone suitable for an international audience. Make the text concise and impactful.\n`;

    try {
      const openai = new OpenAI({
        apiKey,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      return content || "Error generating text";
    } catch (error) {
      console.error("OpenAI API Error:", error);
      return "Error generating text";
    }
  }

  async generateUniquenessCategories(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('⭐ [OpenAI] Generate Uniqueness Categories - Request:', {
        companyName: req.body.profile?.name,
        industry: req.body.profile?.industry
      });

      const { profile } = req.body;

      if (!apiKey) {
        console.error('❌ [OpenAI] API key not configured');
        return res.status(500).json({
          success: false,
          message: 'OpenAI API key is not configured',
        });
      }

      if (!profile) {
        console.warn('⚠️ [OpenAI] Company profile is required');
        return res.status(400).json({
          success: false,
          message: 'Company profile is required',
        });
      }

      console.log('📊 [OpenAI] Profile data for uniqueness generation:', {
        name: profile.name,
        industry: profile.industry,
        hasMission: !!profile.mission,
        hasOverview: !!profile.overview,
        valuesCount: profile.culture?.values?.length || 0,
        benefitsCount: profile.culture?.benefits?.length || 0
      });

      const prompt = `Generate 4-6 uniqueness categories for a company profile page. Based on this company information:

Company: ${profile.name}
Industry: ${profile.industry ?? 'N/A'}
Mission: ${profile.mission ?? 'N/A'}
Overview: ${profile.overview ?? 'N/A'}
Values: ${(profile.culture?.values ?? []).join(', ') || 'N/A'}
Benefits: ${(profile.culture?.benefits ?? []).join(', ') || 'N/A'}
Opportunities: ${(profile.opportunities?.roles ?? []).join(', ') || 'N/A'}

Generate categories that highlight why someone should partner with this company. Each category should include:
- title: A compelling category name
- description: Brief description of the category
- score: A number from 1-5 representing the strength
- details: An array of 3-5 specific benefits or features

Available icons: Award, Globe2, DollarSign, TrendingUp, Rocket, Users, ShieldCheck, Zap

Return the response as a valid JSON object with this exact structure:
{
  "categories": [
    {
      "title": "string",
      "icon": "iconName",
      "description": "string", 
      "score": number,
      "details": ["string", "string", "string"]
    }
  ]
}

Make the categories relevant to the company's industry and strengths. Focus on what makes this company unique and attractive to potential partners.`;

      const openai = new OpenAI({
        apiKey,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
      });

      console.log('✅ [OpenAI] Uniqueness categories response received:', {
        usage: response.usage,
        model: response.model,
        contentLength: response.choices[0]?.message?.content?.length
      });

      const content = response.choices[0]?.message?.content;
      console.log('📄 [OpenAI] Raw uniqueness content:', content);

      if (!content) {
        console.error('❌ [OpenAI] No content received from OpenAI');
        throw new Error("No content received from OpenAI");
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(content);
      } catch (parseError) {
        console.error("💥 [OpenAI] Failed to parse OpenAI response:", parseError);
        throw new Error("Invalid JSON response from OpenAI");
      }

      // Handle both array and object responses
      let categoriesArray: any[];
      if (Array.isArray(parsedResponse)) {
        categoriesArray = parsedResponse;
      } else if (parsedResponse.categories && Array.isArray(parsedResponse.categories)) {
        categoriesArray = parsedResponse.categories;
      } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
        categoriesArray = parsedResponse.data;
      } else {
        console.error("Unexpected response format:", parsedResponse);
        throw new Error("Invalid response format from OpenAI");
      }

      // Validate and format categories
      const formattedCategories = categoriesArray.map((category: any, index: number) => {
        if (!category.title || !category.description || !category.details || !Array.isArray(category.details)) {
          console.error(`Invalid category at index ${index}:`, category);
          throw new Error(`Invalid category structure at index ${index}`);
        }

        return {
          title: category.title,
          description: category.description,
          score: typeof category.score === 'number' ? category.score : 4,
          details: category.details,
          icon: category.icon || 'Award', // Default to Award if icon not found
        };
      });

      console.log('🎯 [OpenAI] Formatted uniqueness categories:', {
        categoriesCount: formattedCategories.length,
        categories: formattedCategories.map((cat: any) => ({
          title: cat.title,
          icon: cat.icon,
          score: cat.score,
          detailsCount: cat.details?.length || 0
        }))
      });

      res.status(200).json({
        success: true,
        data: formattedCategories,
      });
    } catch (error) {
      console.error("💥 [OpenAI] Uniqueness categories error:", error);
      next(error);
    }
  }
}
