"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoCompanyRepository = void 0;
const CompanyModel_1 = require("../../infrastructure/database/models/CompanyModel");
class MongoCompanyRepository {
    constructor() {
        this.companyModel = CompanyModel_1.CompanyModel;
    }
    async findByName(name) {
        return await this.companyModel.findOne({ name });
    }
    async create(data) {
        const company = new this.companyModel(data);
        return await company.save();
    }
    async findAll() {
        return await this.companyModel.find();
    }
    async findById(id) {
        return await this.companyModel.findById(id);
    }
    async update(id, data) {
        return await this.companyModel.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });
    }
    async findOneByUserId(userId) {
        return await CompanyModel_1.CompanyModel.findOne({ userId });
    }
    async delete(id) {
        const result = await this.companyModel.findByIdAndDelete(id);
        return result !== null;
    }
}
exports.MongoCompanyRepository = MongoCompanyRepository;
