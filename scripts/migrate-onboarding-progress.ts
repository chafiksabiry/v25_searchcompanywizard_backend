/**
 * Migration script to initialize onboarding progress for existing companies
 * that don't have one yet.
 * 
 * Run this script with: npm run migrate:onboarding
 */

import mongoose from 'mongoose';
import { CompanyModel } from '../src/infrastructure/database/models/CompanyModel';
import { OnboardingProgress } from '../src/infrastructure/models/onboardingProgress';
import { connectDB } from '../src/infrastructure/database/mongoose';
import { getDefaultPhases, applyComingSoonFlags } from '../src/infrastructure/utils/onboardingProgressUtils';

async function migrateOnboardingProgress() {
    try {
        console.log('🔄 Connecting to database...');
        await connectDB();

        console.log('🔍 Finding companies without onboarding progress...');

        // Get all companies
        const companies = await CompanyModel.find({});
        console.log(`📊 Found ${companies.length} companies`);

        let initialized = 0;
        let skipped = 0;
        let errors = 0;

        for (const company of companies) {
            try {
                // Check if onboarding progress already exists
                const existingProgress = await OnboardingProgress.findOne({
                    companyId: company._id
                });

                if (existingProgress) {
                    console.log(`⏭️  Skipping ${company.name} - already has onboarding progress`);
                    skipped++;
                    continue;
                }

                // Initialize onboarding progress
                const phases = getDefaultPhases();
                applyComingSoonFlags(phases);
                const phase1 = phases.find((p) => p.id === 1);
                const step1 = phase1?.steps.find((s) => s.id === 1);
                if (step1) {
                    step1.status = 'completed';
                    step1.completedAt = new Date();
                }

                const initialProgress = new OnboardingProgress({
                    companyId: company._id,
                    currentPhase: 1,
                    completedSteps: [1],
                    phases,
                });

                await initialProgress.save();
                console.log(`✅ Initialized onboarding progress for ${company.name}`);
                initialized++;

            } catch (error) {
                console.error(`❌ Error initializing onboarding for ${company.name}:`, error);
                errors++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Initialized: ${initialized}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log(`   📊 Total: ${companies.length}`);

        await mongoose.connection.close();
        console.log('\n✅ Migration completed successfully');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
migrateOnboardingProgress();
