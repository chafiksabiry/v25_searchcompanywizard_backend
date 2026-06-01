/**
 * One-shot migration: renumber onboarding steps to 2026 layout for all companies.
 * Run: npx ts-node scripts/migrate-onboarding-step-renumber-2026.ts
 */

import mongoose from 'mongoose';
import { OnboardingProgress } from '../src/infrastructure/models/onboardingProgress';
import { connectDB } from '../src/infrastructure/database/mongoose';
import { migrateOnboardingStepStructure } from '../src/infrastructure/utils/onboardingProgressUtils';

async function main() {
  await connectDB();
  const all = await OnboardingProgress.find({});
  console.log(`Found ${all.length} onboarding progress documents`);

  let updated = 0;
  for (const doc of all) {
    const before = JSON.stringify({
      p2: doc.phases.find((p) => p.id === 2)?.steps.map((s) => s.id),
      p3: doc.phases.find((p) => p.id === 3)?.steps.map((s) => s.id),
      completed: doc.completedSteps,
    });
    const changed = migrateOnboardingStepStructure(doc);
    if (changed) {
      doc.markModified('phases');
      doc.markModified('completedSteps');
      await doc.save();
      updated++;
      const after = JSON.stringify({
        p2: doc.phases.find((p) => p.id === 2)?.steps.map((s) => s.id),
        p3: doc.phases.find((p) => p.id === 3)?.steps.map((s) => s.id),
        completed: doc.completedSteps,
      });
      console.log(`✅ ${doc.companyId}: ${before} → ${after}`);
    }
  }

  console.log(`\nDone. Updated ${updated} / ${all.length} documents.`);
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
