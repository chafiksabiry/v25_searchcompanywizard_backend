/**
 * Backfill FR/EN i18n fields on existing companies (overview, mission, industry, …).
 * Preserves _ids — safe for production.
 *
 * Usage:
 *   MONGODB_URI="mongodb://.../harx?authSource=admin" OPENAI_API_KEY="sk-..." node src/scripts/seedCompanyProfileI18n.js
 *
 * Optional:
 *   DRY_RUN=1  — preview without writing
 *   LIMIT=20   — process at most N companies
 */
const mongoose = require('mongoose');
const OpenAI = require('openai');

require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://mongo:DiGaBWUZXCkIxlZMuntztBaFJcOlUJIg@maglev.proxy.rlwy.net:40270/harx?authSource=admin';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DRY_RUN = String(process.env.DRY_RUN || '') === '1';
const LIMIT = Number(process.env.LIMIT || 0) || 0;

const i18nStringSchema = {
  en: { type: String, required: false },
  fr: { type: String, required: false },
};

const i18nStringListSchema = {
  en: [{ type: String }],
  fr: [{ type: String }],
};

const companySchema = new mongoose.Schema(
  {
    name: String,
    industry: String,
    industry_i18n: i18nStringSchema,
    overview: String,
    overview_i18n: i18nStringSchema,
    companyIntro: String,
    companyIntro_i18n: i18nStringSchema,
    mission: String,
    mission_i18n: i18nStringSchema,
    culture: {
      values: [String],
      values_i18n: i18nStringListSchema,
      benefits: [String],
      benefits_i18n: i18nStringListSchema,
      workEnvironment: String,
      workEnvironment_i18n: i18nStringSchema,
    },
    opportunities: {
      roles: [String],
      roles_i18n: i18nStringListSchema,
      growthPotential: String,
      growthPotential_i18n: i18nStringSchema,
      training: String,
      training_i18n: i18nStringSchema,
    },
    technology: {
      stack: [String],
      innovation: String,
      innovation_i18n: i18nStringSchema,
    },
  },
  { collection: 'companies', strict: false }
);

const Company = mongoose.models.CompanySeedI18n || mongoose.model('CompanySeedI18n', companySchema);

function needsTextI18n(plain, i18n) {
  const p = String(plain || '').trim();
  if (!p && !(i18n?.en || i18n?.fr)) return false;
  const en = String(i18n?.en || '').trim();
  const fr = String(i18n?.fr || '').trim();
  return !en || !fr;
}

function needsListI18n(plain, i18n) {
  const list = Array.isArray(plain) ? plain.filter(Boolean) : [];
  if (list.length === 0 && !(i18n?.en?.length || i18n?.fr?.length)) return false;
  const en = Array.isArray(i18n?.en) ? i18n.en : [];
  const fr = Array.isArray(i18n?.fr) ? i18n.fr : [];
  return en.length === 0 || fr.length === 0;
}

function companyNeedsI18n(doc) {
  return (
    needsTextI18n(doc.industry, doc.industry_i18n) ||
    needsTextI18n(doc.overview, doc.overview_i18n) ||
    needsTextI18n(doc.mission, doc.mission_i18n) ||
    needsTextI18n(doc.companyIntro, doc.companyIntro_i18n) ||
    needsTextI18n(doc.culture?.workEnvironment, doc.culture?.workEnvironment_i18n) ||
    needsListI18n(doc.culture?.values, doc.culture?.values_i18n) ||
    needsListI18n(doc.culture?.benefits, doc.culture?.benefits_i18n) ||
    needsTextI18n(doc.opportunities?.growthPotential, doc.opportunities?.growthPotential_i18n) ||
    needsTextI18n(doc.opportunities?.training, doc.opportunities?.training_i18n) ||
    needsListI18n(doc.opportunities?.roles, doc.opportunities?.roles_i18n) ||
    needsTextI18n(doc.technology?.innovation, doc.technology?.innovation_i18n)
  );
}

async function translateCompanyFields(openai, doc) {
  const payload = {
    name: doc.name || '',
    industry: doc.industry || doc.industry_i18n?.en || doc.industry_i18n?.fr || '',
    overview: doc.overview || doc.overview_i18n?.en || doc.overview_i18n?.fr || '',
    mission: doc.mission || doc.mission_i18n?.en || doc.mission_i18n?.fr || '',
    companyIntro: doc.companyIntro || doc.companyIntro_i18n?.en || doc.companyIntro_i18n?.fr || '',
    culture: {
      values: doc.culture?.values || doc.culture?.values_i18n?.en || doc.culture?.values_i18n?.fr || [],
      benefits:
        doc.culture?.benefits || doc.culture?.benefits_i18n?.en || doc.culture?.benefits_i18n?.fr || [],
      workEnvironment:
        doc.culture?.workEnvironment ||
        doc.culture?.workEnvironment_i18n?.en ||
        doc.culture?.workEnvironment_i18n?.fr ||
        '',
    },
    opportunities: {
      roles:
        doc.opportunities?.roles ||
        doc.opportunities?.roles_i18n?.en ||
        doc.opportunities?.roles_i18n?.fr ||
        [],
      growthPotential:
        doc.opportunities?.growthPotential ||
        doc.opportunities?.growthPotential_i18n?.en ||
        doc.opportunities?.growthPotential_i18n?.fr ||
        '',
      training:
        doc.opportunities?.training ||
        doc.opportunities?.training_i18n?.en ||
        doc.opportunities?.training_i18n?.fr ||
        '',
    },
    technology: {
      innovation:
        doc.technology?.innovation ||
        doc.technology?.innovation_i18n?.en ||
        doc.technology?.innovation_i18n?.fr ||
        '',
    },
  };

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 2500,
    messages: [
      {
        role: 'system',
        content: `You translate company profile fields into bilingual French and English.
Return ONLY JSON with this shape (omit a field if the source is empty):
{
  "industry": { "en": "", "fr": "" },
  "overview": { "en": "", "fr": "" },
  "mission": { "en": "", "fr": "" },
  "companyIntro": { "en": "", "fr": "" },
  "culture": {
    "values": { "en": [], "fr": [] },
    "benefits": { "en": [], "fr": [] },
    "workEnvironment": { "en": "", "fr": "" }
  },
  "opportunities": {
    "roles": { "en": [], "fr": [] },
    "growthPotential": { "en": "", "fr": "" },
    "training": { "en": "", "fr": "" }
  },
  "technology": {
    "innovation": { "en": "", "fr": "" }
  }
}
Keep meaning equivalent. If the source is already one language, fill the other. Do not invent new facts.`,
      },
      {
        role: 'user',
        content: `Translate this company profile:\n${JSON.stringify(payload)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');
  return JSON.parse(content);
}

function mergeTextI18n(existing, generated, plainFallback) {
  const plain = String(plainFallback || '').trim();
  const en =
    String(existing?.en || generated?.en || '').trim() ||
    String(existing?.fr || generated?.fr || plain).trim();
  const fr =
    String(existing?.fr || generated?.fr || '').trim() ||
    String(existing?.en || generated?.en || plain).trim();
  if (!en && !fr) return undefined;
  return { en, fr };
}

function mergeListI18n(existing, generated, plainFallback) {
  const plain = Array.isArray(plainFallback) ? plainFallback.filter(Boolean) : [];
  const en =
    (Array.isArray(existing?.en) && existing.en.length ? existing.en : null) ||
    (Array.isArray(generated?.en) && generated.en.length ? generated.en : null) ||
    (Array.isArray(existing?.fr) && existing.fr.length ? existing.fr : null) ||
    (Array.isArray(generated?.fr) && generated.fr.length ? generated.fr : null) ||
    plain;
  const fr =
    (Array.isArray(existing?.fr) && existing.fr.length ? existing.fr : null) ||
    (Array.isArray(generated?.fr) && generated.fr.length ? generated.fr : null) ||
    (Array.isArray(existing?.en) && existing.en.length ? existing.en : null) ||
    (Array.isArray(generated?.en) && generated.en.length ? generated.en : null) ||
    plain;
  if (!en.length && !fr.length) return undefined;
  return { en, fr };
}

async function main() {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is required');
    process.exit(1);
  }

  console.log(`🔗 Connecting… DRY_RUN=${DRY_RUN} LIMIT=${LIMIT || 'all'}`);
  await mongoose.connect(MONGODB_URI);
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  let query = Company.find({}).lean();
  if (LIMIT > 0) query = query.limit(LIMIT);
  const docs = await query;
  console.log(`📦 Loaded ${docs.length} companies`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    if (!companyNeedsI18n(doc)) {
      skipped += 1;
      continue;
    }

    const label = `${doc.name || doc._id}`;
    try {
      console.log(`… translating: ${label}`);
      const gen = await translateCompanyFields(openai, doc);

      const industry_i18n = mergeTextI18n(doc.industry_i18n, gen.industry, doc.industry);
      const overview_i18n = mergeTextI18n(doc.overview_i18n, gen.overview, doc.overview);
      const mission_i18n = mergeTextI18n(doc.mission_i18n, gen.mission, doc.mission);
      const companyIntro_i18n = mergeTextI18n(
        doc.companyIntro_i18n,
        gen.companyIntro,
        doc.companyIntro
      );

      const patch = {
        industry: industry_i18n?.fr || industry_i18n?.en || doc.industry,
        industry_i18n,
        overview: overview_i18n?.fr || overview_i18n?.en || doc.overview,
        overview_i18n,
        mission: mission_i18n?.fr || mission_i18n?.en || doc.mission,
        mission_i18n,
        companyIntro: companyIntro_i18n?.fr || companyIntro_i18n?.en || doc.companyIntro,
        companyIntro_i18n,
        culture: {
          ...(doc.culture || {}),
          values_i18n: mergeListI18n(
            doc.culture?.values_i18n,
            gen.culture?.values,
            doc.culture?.values
          ),
          benefits_i18n: mergeListI18n(
            doc.culture?.benefits_i18n,
            gen.culture?.benefits,
            doc.culture?.benefits
          ),
          workEnvironment_i18n: mergeTextI18n(
            doc.culture?.workEnvironment_i18n,
            gen.culture?.workEnvironment,
            doc.culture?.workEnvironment
          ),
        },
        opportunities: {
          ...(doc.opportunities || {}),
          roles_i18n: mergeListI18n(
            doc.opportunities?.roles_i18n,
            gen.opportunities?.roles,
            doc.opportunities?.roles
          ),
          growthPotential_i18n: mergeTextI18n(
            doc.opportunities?.growthPotential_i18n,
            gen.opportunities?.growthPotential,
            doc.opportunities?.growthPotential
          ),
          training_i18n: mergeTextI18n(
            doc.opportunities?.training_i18n,
            gen.opportunities?.training,
            doc.opportunities?.training
          ),
        },
        technology: {
          ...(doc.technology || {}),
          innovation_i18n: mergeTextI18n(
            doc.technology?.innovation_i18n,
            gen.technology?.innovation,
            doc.technology?.innovation
          ),
        },
      };

      if (DRY_RUN) {
        console.log(`  [dry-run] would update ${label}`, {
          industry_i18n: patch.industry_i18n,
          overview_preview: {
            en: String(patch.overview_i18n?.en || '').slice(0, 80),
            fr: String(patch.overview_i18n?.fr || '').slice(0, 80),
          },
        });
      } else {
        await Company.updateOne({ _id: doc._id }, { $set: patch });
        console.log(`  ✅ updated ${label}`);
      }
      updated += 1;
    } catch (err) {
      failed += 1;
      console.error(`  ❌ ${label}:`, err.message || err);
    }
  }

  console.log(`Done. updated=${updated} skipped=${skipped} failed=${failed}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
