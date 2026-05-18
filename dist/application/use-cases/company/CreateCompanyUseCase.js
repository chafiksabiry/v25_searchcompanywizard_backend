"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCompanyUseCase = void 0;
const onboardingProgress_1 = require("../../../infrastructure/models/onboardingProgress");
const onboardingProgressUtils_1 = require("../../../infrastructure/utils/onboardingProgressUtils");
class CreateCompanyUseCase {
    constructor(companyRepository) {
        this.companyRepository = companyRepository;
    }
    async execute(companyData) {
        const existingCompany = await this.companyRepository.findByName(companyData.name);
        if (existingCompany) {
            throw new Error('Company with this name already exists');
        }
        // Create the company
        const newCompany = await this.companyRepository.create(companyData);
        // Initialize onboarding progress for the new company
        try {
            const companyId = newCompany._id;
            const phases = (0, onboardingProgressUtils_1.getDefaultPhases)();
            (0, onboardingProgressUtils_1.applyComingSoonFlags)(phases);
            (0, onboardingProgressUtils_1.advanceAfterProfileCreated)(phases);
            const initialProgress = new onboardingProgress_1.OnboardingProgress({
                companyId: companyId,
                currentPhase: 2,
                completedSteps: [1],
                phases,
            });
            await initialProgress.save();
            // eslint-disable-next-line no-console
            console.log('✅ Onboarding progress initialized for company:', companyId);
        }
        catch (error) {
            // eslint-disable-next-line no-console
            console.error('⚠️ Failed to initialize onboarding progress:', error);
            // Don't fail company creation if onboarding init fails
        }
        return newCompany;
    }
}
exports.CreateCompanyUseCase = CreateCompanyUseCase;
