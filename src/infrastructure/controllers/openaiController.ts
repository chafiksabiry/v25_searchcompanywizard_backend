import { Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { CompanyModel } from '../database/models/CompanyModel';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('OPENAI_API_KEY is not configured');
}

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

  async generateCompanyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('🏢 [OpenAI] Generate Company Profile - Request:', { 
        companyInfo: req.body.companyInfo?.substring(0, 100) + '...', 
        userId: req.body.userId 
      });

      const { companyInfo, userId } = req.body;

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

      const openai = new OpenAI({
        apiKey,
      });

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

      console.log('✅ [OpenAI] Profile generation response received:', {
        usage: response.usage,
        model: response.model,
        contentLength: response.choices[0]?.message?.content?.length
      });

      const content = response.choices[0]?.message?.content;
      console.log('📄 [OpenAI] Raw profile content:', content);

      if (!content) {
        console.error('❌ [OpenAI] No content received from OpenAI');
        throw new Error("No content received from OpenAI");
      }

      const parsedProfile = JSON.parse(content) as Omit<CompanyProfile, "userId" | "companyIntro">;
      console.log('🔍 [OpenAI] Parsed profile structure:', {
        name: parsedProfile.name,
        industry: parsedProfile.industry,
        hasContact: !!parsedProfile.contact,
        hasCulture: !!parsedProfile.culture,
        valuesCount: parsedProfile.culture?.values?.length || 0,
        benefitsCount: parsedProfile.culture?.benefits?.length || 0
      });

      // Generate company intro
      const companyIntroResponse = await this.generateCompanyIntro({
        userId: userId || '681a91212c1ca099fe2b17df',
        ...parsedProfile,
        culture: {
          ...parsedProfile.culture,
          values: parsedProfile.culture?.values || [],
          benefits: parsedProfile.culture?.benefits || [],
          workEnvironment: parsedProfile.culture?.workEnvironment || "",
        },
        opportunities: {
          ...parsedProfile.opportunities,
          roles: parsedProfile.opportunities?.roles || [],
          growthPotential: parsedProfile.opportunities?.growthPotential || "",
          training: parsedProfile.opportunities?.training || "",
        },
        technology: {
          ...parsedProfile.technology,
          stack: parsedProfile.technology?.stack || [],
          innovation: parsedProfile.technology?.innovation || "",
        },
        contact: {
          ...parsedProfile.contact,
          email: parsedProfile.contact?.email || "",
          phone: parsedProfile.contact?.phone || "Téléphone non trouvé - Cliquez pour ajouter manuellement",
          address: parsedProfile.contact?.address || "",
          website: parsedProfile.contact?.website || "",
        },
        socialMedia: {
          ...parsedProfile.socialMedia,
          linkedin: parsedProfile.socialMedia?.linkedin || "",
          twitter: parsedProfile.socialMedia?.twitter || "",
          facebook: parsedProfile.socialMedia?.facebook || "",
          instagram: parsedProfile.socialMedia?.instagram || "",
        },
      });

      const finalProfile: CompanyProfile = {
        userId: userId || '681a91212c1ca099fe2b17df',
        companyIntro: companyIntroResponse,
        ...parsedProfile,
        culture: {
          ...parsedProfile.culture,
          values: parsedProfile.culture?.values || [],
          benefits: parsedProfile.culture?.benefits || [],
          workEnvironment: parsedProfile.culture?.workEnvironment || "",
        },
        opportunities: {
          ...parsedProfile.opportunities,
          roles: parsedProfile.opportunities?.roles || [],
          growthPotential: parsedProfile.opportunities?.growthPotential || "",
          training: parsedProfile.opportunities?.training || "",
        },
        technology: {
          ...parsedProfile.technology,
          stack: parsedProfile.technology?.stack || [],
          innovation: parsedProfile.technology?.innovation || "",
        },
        contact: {
          ...parsedProfile.contact,
          email: parsedProfile.contact?.email || "",
          phone: parsedProfile.contact?.phone || "Téléphone non trouvé - Cliquez pour ajouter manuellement",
          address: parsedProfile.contact?.address || "",
          website: parsedProfile.contact?.website || "",
        },
        socialMedia: {
          ...parsedProfile.socialMedia,
          linkedin: parsedProfile.socialMedia?.linkedin || "",
          twitter: parsedProfile.socialMedia?.twitter || "",
          facebook: parsedProfile.socialMedia?.facebook || "",
          instagram: parsedProfile.socialMedia?.instagram || "",
        },
      };

      console.log('🎯 [OpenAI] Final response data keys:', Object.keys(finalProfile));

      // Ne pas sauvegarder automatiquement - laisser l'utilisateur décider
      console.log('ℹ️ [OpenAI] Profile generated but not saved - waiting for user action');

      res.status(200).json({
        success: true,
        data: finalProfile,
      });
    } catch (error) {
      console.error("💥 [OpenAI] Profile generation error:", error);
      next(error);
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
