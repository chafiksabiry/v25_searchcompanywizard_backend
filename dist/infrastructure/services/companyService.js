"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const CreateCompanyUseCase_1 = require("../../application/use-cases/company/CreateCompanyUseCase");
const companyRepository_1 = require("../repositories/companyRepository");
const onboardingProgress_1 = require("../models/onboardingProgress");
const companyI18nRepair_1 = require("./companyI18nRepair");
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
        const company = await companyRepository_1.companyRepository.findById(id);
        if (!company)
            return null;
        const plain = typeof company.toObject === 'function'
            ? company.toObject()
            : company;
        if (!(0, companyI18nRepair_1.companyNeedsI18nRepair)(plain))
            return company;
        const repaired = await (0, companyI18nRepair_1.repairCompanyI18n)(plain);
        if (repaired === plain)
            return company;
        // Persist repaired bilingual fields so EN/FR switch works next time without re-AI.
        const updated = await companyRepository_1.companyRepository.update(id, {
            industry: repaired.industry,
            industry_i18n: repaired.industry_i18n,
            overview: repaired.overview,
            overview_i18n: repaired.overview_i18n,
            mission: repaired.mission,
            mission_i18n: repaired.mission_i18n,
            companyIntro: repaired.companyIntro,
            companyIntro_i18n: repaired.companyIntro_i18n,
        });
        return updated || repaired;
    }
    async getCompanyByUserId(userId) {
        return await companyRepository_1.companyRepository.findOneByUserId(userId);
    }
    async updateCompany(id, companyData) {
        // Flatten to dotted paths under $set so partial nested updates
        // (e.g. only overview_i18n.fr) do not wipe the other language side.
        const flattenData = (data, prefix = '') => {
            let result = {};
            for (const [key, value] of Object.entries(data || {})) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                    result = { ...result, ...flattenData(value, newKey) };
                }
                else {
                    result[newKey] = value;
                }
            }
            return result;
        };
        return await companyRepository_1.companyRepository.update(id, { $set: flattenData(companyData) });
    }
    async deleteCompany(id) {
        await onboardingProgress_1.OnboardingProgress.deleteOne({ companyId: id });
        return await companyRepository_1.companyRepository.delete(id);
    }
}
exports.CompanyService = CompanyService;
