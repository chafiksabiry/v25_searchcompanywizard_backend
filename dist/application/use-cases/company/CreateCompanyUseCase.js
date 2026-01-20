"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCompanyUseCase = void 0;
class CreateCompanyUseCase {
    constructor(companyRepository) {
        this.companyRepository = companyRepository;
    }
    async execute(companyData) {
        const existingCompany = await this.companyRepository.findByName(companyData.name);
        if (existingCompany) {
            throw new Error('Company with this name already exists');
        }
        return this.companyRepository.create(companyData);
    }
}
exports.CreateCompanyUseCase = CreateCompanyUseCase;
