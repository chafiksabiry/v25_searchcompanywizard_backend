"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyNeedsI18nRepair = companyNeedsI18nRepair;
exports.repairCompanyI18n = repairCompanyI18n;
exports.i18nTextNeedsRepair = i18nTextNeedsRepair;
const openai_1 = __importDefault(require("openai"));
function textPairNeedsRepair(plain, i18n) {
    const en = String(i18n?.en || '').trim();
    const fr = String(i18n?.fr || '').trim();
    const base = String(plain || '').trim();
    if (!en && !fr && !base)
        return false;
    if (!en || !fr)
        return true;
    return en === fr;
}
function companyNeedsI18nRepair(doc) {
    if (!doc)
        return false;
    return (textPairNeedsRepair(doc.industry, doc.industry_i18n) ||
        textPairNeedsRepair(doc.overview, doc.overview_i18n) ||
        textPairNeedsRepair(doc.mission, doc.mission_i18n) ||
        textPairNeedsRepair(doc.companyIntro, doc.companyIntro_i18n));
}
function mergeTextI18n(existing, generated, plain) {
    const en = String(generated?.en || existing?.en || plain || '').trim();
    const fr = String(generated?.fr || existing?.fr || plain || '').trim();
    return {
        en: en || fr,
        fr: fr || en,
    };
}
/**
 * Fill missing / duplicated EN↔FR narrative fields so language switch shows real EN or FR.
 */
async function repairCompanyI18n(doc) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !companyNeedsI18nRepair(doc))
        return doc;
    const payload = {
        industry: doc.industry || doc.industry_i18n?.en || doc.industry_i18n?.fr || '',
        overview: doc.overview || doc.overview_i18n?.en || doc.overview_i18n?.fr || '',
        mission: doc.mission || doc.mission_i18n?.en || doc.mission_i18n?.fr || '',
        companyIntro: doc.companyIntro || doc.companyIntro_i18n?.en || doc.companyIntro_i18n?.fr || '',
    };
    try {
        const openai = new openai_1.default({ apiKey });
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 1800,
            messages: [
                {
                    role: 'system',
                    content: `You translate company profile fields into bilingual French and English.
Return ONLY JSON:
{
  "industry": { "en": "", "fr": "" },
  "overview": { "en": "", "fr": "" },
  "mission": { "en": "", "fr": "" },
  "companyIntro": { "en": "", "fr": "" }
}
Keep meaning equivalent. If a side is missing or identical, fill a proper translation. Do not invent new facts.`,
                },
                {
                    role: 'user',
                    content: JSON.stringify(payload),
                },
            ],
        });
        const content = response.choices[0]?.message?.content;
        if (!content)
            return doc;
        const gen = JSON.parse(content);
        const industry_i18n = mergeTextI18n(doc.industry_i18n, gen.industry, doc.industry);
        const overview_i18n = mergeTextI18n(doc.overview_i18n, gen.overview, doc.overview);
        const mission_i18n = mergeTextI18n(doc.mission_i18n, gen.mission, doc.mission);
        const companyIntro_i18n = mergeTextI18n(doc.companyIntro_i18n, gen.companyIntro, doc.companyIntro);
        return {
            ...doc,
            industry: industry_i18n.fr || industry_i18n.en || doc.industry,
            industry_i18n,
            overview: overview_i18n.fr || overview_i18n.en || doc.overview,
            overview_i18n,
            mission: mission_i18n.fr || mission_i18n.en || doc.mission,
            mission_i18n,
            companyIntro: companyIntro_i18n.fr || companyIntro_i18n.en || doc.companyIntro,
            companyIntro_i18n,
        };
    }
    catch (err) {
        console.warn('[companyI18nRepair] Failed to repair bilingual fields:', err?.message);
        return doc;
    }
}
/** True when a bilingual text pair is incomplete or duplicated. */
function i18nTextNeedsRepair(i18n, plain) {
    return textPairNeedsRepair(plain, i18n);
}
