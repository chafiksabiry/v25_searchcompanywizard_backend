import { Company } from '../../../domain/entities/Company';
import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';
import { OnboardingProgress } from '../../../infrastructure/models/onboardingProgress';

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
      const initialProgress = new OnboardingProgress({
        companyId: companyId,
        currentPhase: 2,
        completedSteps: [1], // Step 1 completed (company profile created), Phase 1 marked complete
        phases: [
          {
            id: 1,
            status: 'completed',
            steps: [
              { id: 1, status: 'completed', completedAt: new Date() },
              { id: 2, status: 'pending' }
            ]
          },
          {
            id: 2,
            status: 'in_progress',
            steps: [
              { id: 3, status: 'pending' },
              { id: 4, status: 'pending' },
              { id: 5, status: 'pending' },
              { id: 6, status: 'pending' },
              { id: 7, status: 'pending' }
            ]
          },
          {
            id: 3,
            status: 'pending',
            steps: [
              { id: 8, status: 'pending' },
              { id: 9, status: 'pending' },
              { id: 10, status: 'pending' }
            ]
          },
          {
            id: 4,
            status: 'pending',
            steps: [
              { id: 11, status: 'pending' },
              { id: 12, status: 'pending' },
              { id: 13, status: 'pending' }
            ]
          }
        ]
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