import { Model } from "mongoose";
import { Company } from "../../domain/entities/Company";
import { ICompanyRepository } from "../../domain/repositories/ICompanyRepository";
import { CompanyModel } from "../../infrastructure/database/models/CompanyModel";

export class MongoCompanyRepository implements ICompanyRepository {
  private companyModel: Model<Company>;

  constructor() {
    this.companyModel = CompanyModel;
  }

  async findByName(name: string): Promise<Company | null> {
    return await this.companyModel.findOne({ name });
  }

  async create(data: Partial<Company>): Promise<Company> {
    const company = new this.companyModel(data);
    return await company.save();
  }

  async findAll(): Promise<Company[]> {
    return await this.companyModel.find();
  }

  async findById(id: string): Promise<Company | null> {
    return await this.companyModel.findById(id);
  }

  async update(id: string, data: Partial<Company>): Promise<Company | null> {
    return await this.companyModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async findOneByUserId(userId: string) {
    return await CompanyModel.findOne({ userId });
  }
  

  async delete(id: string): Promise<boolean> {
    const result = await this.companyModel.findByIdAndDelete(id);
    return result !== null;
  }
}
