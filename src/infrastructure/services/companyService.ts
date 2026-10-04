import { CreateCompanyUseCase } from '../../application/use-cases/company/CreateCompanyUseCase';
import { companyRepository } from '../repositories/companyRepository';
import { OnboardingProgress } from '../models/onboardingProgress';
import { companyNeedsI18nRepair, repairCompanyI18n } from './companyI18nRepair';

export class CompanyService {
  private createCompanyUseCase = new CreateCompanyUseCase(companyRepository);

  async createCompany(companyData: any) {
    return await this.createCompanyUseCase.execute(companyData);
  }

  async getAllCompanies() {
    return await companyRepository.findAll();
  }

  async getCompanyById(id: string) {
    return await companyRepository.findById(id);
  }

  async getCompanyDetails(id: string) {
    const company = await companyRepository.findById(id);
    if (!company) return null;

    const plain = typeof (company as any).toObject === 'function'
      ? (company as any).toObject()
      : company;

    if (!companyNeedsI18nRepair(plain)) return company;

    const repaired = await repairCompanyI18n(plain);
    if (repaired === plain) return company;

    // Persist repaired bilingual fields so EN/FR switch works next time without re-AI.
    const updated = await companyRepository.update(id, {
      industry: repaired.industry,
      industry_i18n: repaired.industry_i18n,
      overview: repaired.overview,
      overview_i18n: repaired.overview_i18n,
      mission: repaired.mission,
      mission_i18n: repaired.mission_i18n,
      companyIntro: repaired.companyIntro,
      companyIntro_i18n: repaired.companyIntro_i18n,
    } as any);
    return updated || repaired;
  }

  async getCompanyByUserId(userId: string) {
    return await companyRepository.findOneByUserId(userId);
  }

  async updateCompany(id: string, companyData: any) {
    // Flatten to dotted paths under $set so partial nested updates
    // (e.g. only overview_i18n.fr) do not wipe the other language side.
    const flattenData = (data: any, prefix: string = ''): Record<string, unknown> => {
      let result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data || {})) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          result = { ...result, ...flattenData(value, newKey) };
        } else {
          result[newKey] = value;
        }
      }
      return result;
    };

    return await companyRepository.update(id, { $set: flattenData(companyData) } as any);
  }

  async deleteCompany(id: string) {
    await OnboardingProgress.deleteOne({ companyId: id });
    return await companyRepository.delete(id);
  }
}

