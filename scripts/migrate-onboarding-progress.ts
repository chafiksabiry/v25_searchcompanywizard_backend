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
                const initialProgress = new OnboardingProgress({
                    companyId: company._id,
                    currentPhase: 1,
                    completedSteps: [1], // Step 1 is completed (company profile exists)
                    phases: [
                        {
                            id: 1,
                            status: 'in_progress',
                            steps: [
                                { id: 1, status: 'completed', completedAt: new Date() },
                                { id: 2, status: 'pending', disabled: true },
                                { id: 3, status: 'pending' }
                            ]
                        },
                        { id: 2, status: 'pending', steps: Array.from({ length: 6 }, (_, i) => ({ id: i + 4, status: 'pending' })) },
                        { id: 3, status: 'pending', steps: Array.from({ length: 3 }, (_, i) => ({ id: i + 10, status: 'pending' })) },
                        { id: 4, status: 'pending', steps: [{ id: 13, status: 'pending' }] }
                    ]
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
