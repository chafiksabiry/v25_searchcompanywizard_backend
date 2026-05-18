import { Company } from '../../../domain/entities/Company';
import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';
import { OnboardingProgress } from '../../../infrastructure/models/onboardingProgress';
import {
  advanceAfterProfileCreated,
  applyComingSoonFlags,
  getDefaultPhases,
} from '../../../infrastructure/utils/onboardingProgressUtils';

export class CreateCompanyUseCase {
  constructor(private companyRepository: ICompanyRepository) { }

  async execute(companyData: Company): Promise<Company> {
    const existingCompany = await this.companyRepository.findByName(companyData.name);
    if (existingCompany) {
      throw new Error('Company with this name already exists');
    }

    // Create the company
    const newCompany = await this.companyRepository.create(companyData);

    // Initialize onboarding progress for the new company
    try {
      const companyId = (newCompany as any)._id;
      const phases = getDefaultPhases();
      applyComingSoonFlags(phases);
      advanceAfterProfileCreated(phases);

      const initialProgress = new OnboardingProgress({
        companyId: companyId,
        currentPhase: 2,
        completedSteps: [1],
        phases,
      });

      await initialProgress.save();
      // eslint-disable-next-line no-console
      console.log('✅ Onboarding progress initialized for company:', companyId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('⚠️ Failed to initialize onboarding progress:', error);
      // Don't fail company creation if onboarding init fails
    }

    return newCompany;
  }
}