"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCompanyUseCase = void 0;
const onboardingProgress_1 = require("../../../infrastructure/models/onboardingProgress");
const onboardingProgressUtils_1 = require("../../../infrastructure/utils/onboardingProgressUtils");
function companyDocId(company) {
    if (!company)
        return null;
    const id = company._id ?? company.id;
    return id ? String(id) : null;
}
class CreateCompanyUseCase {
    constructor(companyRepository) {
        this.companyRepository = companyRepository;
    }
    async ensureOnboardingProgress(companyId) {
        try {
            const existing = await onboardingProgress_1.OnboardingProgress.findOne({ companyId });
            if (existing)
                return;
            const phases = (0, onboardingProgressUtils_1.getDefaultPhases)();
            (0, onboardingProgressUtils_1.applyComingSoonFlags)(phases);
            (0, onboardingProgressUtils_1.advanceAfterProfileCreated)(phases);
            await new onboardingProgress_1.OnboardingProgress({
                companyId,
                currentPhase: 2,
                completedSteps: [1],
                phases,
            }).save();
            // eslint-disable-next-line no-console
            console.log('✅ Onboarding progress initialized for company:', companyId);
        }
        catch (error) {
            // eslint-disable-next-line no-console
            console.error('⚠️ Failed to initialize onboarding progress:', error);
        }
    }
    async updateExisting(companyId, companyData) {
        const updated = await this.companyRepository.update(companyId, companyData);
        await this.ensureOnboardingProgress(companyId);
        if (!updated) {
            throw new Error('Failed to update existing company');
        }
        return updated;
    }
    async execute(companyData) {
        const repo = this.companyRepository;
        const userId = companyData.userId
            ? String(companyData.userId)
            : '';
        // 1) User already owns a company → update it (publish is idempotent).
        if (userId && repo.findOneByUserId) {
            const byUser = await repo.findOneByUserId(userId);
            const byUserId = companyDocId(byUser);
            if (byUserId) {
                return this.updateExisting(byUserId, companyData);
            }
        }
        // 2) Same name already exists → update if unowned or owned by this user.
        const existingByName = companyData.name
            ? await this.companyRepository.findByName(companyData.name)
            : null;
        const byNameId = companyDocId(existingByName);
        if (byNameId && existingByName) {
            const owner = existingByName.userId
                ? String(existingByName.userId)
                : '';
            if (owner && userId && owner !== userId) {
                throw new Error('Company with this name already exists');
            }
            return this.updateExisting(byNameId, companyData);
        }
        // 3) Create new company
        const newCompany = await this.companyRepository.create(companyData);
        const newId = companyDocId(newCompany);
        if (newId) {
            await this.ensureOnboardingProgress(newId);
        }
        return newCompany;
    }
}
exports.CreateCompanyUseCase = CreateCompanyUseCase;
