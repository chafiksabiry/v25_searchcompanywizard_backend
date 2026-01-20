import { Company } from '../entities/Company';

export interface ICompanyRepository {
  findAll(): Promise<Company[]>;
  findById(id: string): Promise<Company | null>;
  findByName(name: string): Promise<Company | null>;
  create(company: Company): Promise<Company>;
  update(id: string, company: Partial<Company>): Promise<Company | null>;
  delete(id: string): Promise<boolean>;
}