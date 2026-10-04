import { Company } from '../../../domain/entities/Company';
import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';
import { OnboardingProgress } from '../../../infrastructure/models/onboardingProgress';
import {
  advanceAfterProfileCreated,
  applyComingSoonFlags,
  getDefaultPhases,
} from '../../../infrastructure/utils/onboardingProgressUtils';

type CompanyRepo = ICompanyRepository & {
  findOneByUserId?: (userId: string) => Promise<Company | null>;
};

function companyDocId(company: Company | null | undefined): string | null {
  if (!company) return null;
  const id = (company as any)._id ?? (company as any).id;
  return id ? String(id) : null;
}

export class CreateCompanyUseCase {
  constructor(private companyRepository: ICompanyRepository) {}

  private async ensureOnboardingProgress(companyId: string): Promise<void> {
    try {
      const existing = await OnboardingProgress.findOne({ companyId });
      if (existing) return;

      const phases = getDefaultPhases();
      applyComingSoonFlags(phases);
      advanceAfterProfileCreated(phases);

      await new OnboardingProgress({
        companyId,
        currentPhase: 2,
        completedSteps: [1],
        phases,
      }).save();
      // eslint-disable-next-line no-console
      console.log('✅ Onboarding progress initialized for company:', companyId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('⚠️ Failed to initialize onboarding progress:', error);
    }
  }

  private async updateExisting(companyId: string, companyData: Company): Promise<Company> {
    const updated = await this.companyRepository.update(companyId, companyData);
    await this.ensureOnboardingProgress(companyId);
    if (!updated) {
      throw new Error('Failed to update existing company');
    }
    return updated;
  }

  async execute(companyData: Company): Promise<Company> {
    const repo = this.companyRepository as CompanyRepo;
    const userId = (companyData as any).userId
      ? String((companyData as any).userId)
      : '';

    // Same user republishing → update their company. Name uniqueness is NOT required:
    // multiple accounts may publish the same company name (e.g. Samsung demo).
    if (userId && repo.findOneByUserId) {
      const byUser = await repo.findOneByUserId(userId);
      const byUserId = companyDocId(byUser);
      if (byUserId) {
        return this.updateExisting(byUserId, companyData);
      }
    }

    const newCompany = await this.companyRepository.create(companyData);
    const newId = companyDocId(newCompany);
    if (newId) {
      await this.ensureOnboardingProgress(newId);
    }
    return newCompany;
  }
}
