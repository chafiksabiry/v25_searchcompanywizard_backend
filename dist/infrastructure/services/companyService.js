"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const CreateCompanyUseCase_1 = require("../../application/use-cases/company/CreateCompanyUseCase");
const companyRepository_1 = require("../repositories/companyRepository");
const onboardingProgress_1 = require("../models/onboardingProgress");
class CompanyService {
    constructor() {
        this.createCompanyUseCase = new CreateCompanyUseCase_1.CreateCompanyUseCase(companyRepository_1.companyRepository);
    }
    async createCompany(companyData) {
        return await this.createCompanyUseCase.execute(companyData);
    }
    async getAllCompanies() {
        return await companyRepository_1.companyRepository.findAll();
    }
    async getCompanyById(id) {
        return await companyRepository_1.companyRepository.findById(id);
    }
    async getCompanyDetails(id) {
        return await companyRepository_1.companyRepository.findById(id);
    }
    async getCompanyByUserId(userId) {
        return await companyRepository_1.companyRepository.findOneByUserId(userId);
    }
    async updateCompany(id, companyData) {
        // Fonction récursive pour mettre à jour les champs imbriqués
        const flattenData = (data, prefix = '') => {
            let result = {};
            for (const [key, value] of Object.entries(data)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    result = { ...result, ...flattenData(value, newKey) };
                }
                else {
                    result[newKey] = value;
                }
            }
            return result;
        };
        // Aplatir les données de l'entreprise
        const updateData = flattenData(companyData);
        // Appliquer la mise à jour
        return await companyRepository_1.companyRepository.update(id, updateData);
    }
    async deleteCompany(id) {
        await onboardingProgress_1.OnboardingProgress.deleteOne({ companyId: id });
        return await companyRepository_1.companyRepository.delete(id);
    }
}
exports.CompanyService = CompanyService;
