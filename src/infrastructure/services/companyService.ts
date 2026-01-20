import { CreateCompanyUseCase } from '../../application/use-cases/company/CreateCompanyUseCase';
import { companyRepository } from '../repositories/companyRepository';

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
    return await companyRepository.findById(id);
  }

  async getCompanyByUserId(userId: string) {
    return await companyRepository.findOneByUserId(userId);
  }

  async updateCompany(id: string, companyData: any) {
    // Fonction récursive pour mettre à jour les champs imbriqués
    const flattenData = (data: any, prefix: string = ''): any => {
      let result: any = {};

      for (const [key, value] of Object.entries(data)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result = { ...result, ...flattenData(value, newKey) };
        } else {
          result[newKey] = value;
        }
      }

      return result;
    };

    // Aplatir les données de l'entreprise
    const updateData = flattenData(companyData);

    // Appliquer la mise à jour
    return await companyRepository.update(id, updateData);
  }

  async deleteCompany(id: string) {
    return await companyRepository.delete(id);
  }
}

