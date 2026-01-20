"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoCompanyRepository = void 0;
const CompanyModel_1 = require("../database/models/CompanyModel");
class MongoCompanyRepository {
    async findAll() {
        return CompanyModel_1.CompanyModel.find().sort({ createdAt: -1 });
    }
    async findById(id) {
        return CompanyModel_1.CompanyModel.findById(id);
    }
    async findByName(name) {
        return CompanyModel_1.CompanyModel.findOne({ name: new RegExp(name, 'i') });
    }
    async create(company) {
        return CompanyModel_1.CompanyModel.create(company);
    }
    async update(id, company) {
        return CompanyModel_1.CompanyModel.findByIdAndUpdate(id, company, { new: true });
    }
    async delete(id) {
        const result = await CompanyModel_1.CompanyModel.findByIdAndDelete(id);
        return !!result;
    }
}
exports.MongoCompanyRepository = MongoCompanyRepository;
