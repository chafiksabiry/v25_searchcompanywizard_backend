import { Company } from '../../../domain/entities/Company';
import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';

export class CreateCompanyUseCase {
  constructor(private companyRepository: ICompanyRepository) {}

  async execute(companyData: Company): Promise<Company> {
    const existingCompany = await this.companyRepository.findByName(companyData.name);
    if (existingCompany) {
      throw new Error('Company with this name already exists');
    }
    return this.companyRepository.create(companyData);
  }
}