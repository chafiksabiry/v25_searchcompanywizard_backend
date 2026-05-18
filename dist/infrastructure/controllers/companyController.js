"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const companyService_1 = require("../services/companyService");
const CompanyModel_1 = require("../database/models/CompanyModel");
const companyService = new companyService_1.CompanyService();
class CompanyController {
    async createCompany(req, res, next) {
        try {
            const company = await companyService.createCompany(req.body);
            res.status(201).json({
                success: true,
                message: 'Company created successfully',
                data: company,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAllCompanies(req, res, next) {
        try {
            const companies = await companyService.getAllCompanies();
            res.status(200).json({
                success: true,
                message: 'Companies retrieved successfully',
                data: companies,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCompanyById(req, res, next) {
        try {
            const company = await companyService.getCompanyById(req.params.id);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found',
                });
            }
            res.status(200).json({
                success: true,
                message: 'Company retrieved successfully',
                data: company,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateCompany(req, res, next) {
        try {
            const updatedCompany = await companyService.updateCompany(req.params.id, req.body);
            if (!updatedCompany) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found',
                });
            }
            res.status(200).json({
                success: true,
                message: 'Company updated successfully',
                data: updatedCompany,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteCompany(req, res, next) {
        try {
            const deleted = await companyService.deleteCompany(req.params.id);
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found',
                });
            }
            res.status(200).json({
                success: true,
                message: 'Company deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateSubscription(req, res) {
        try {
            const { id } = req.params;
            const { subscription } = req.body;
            // Vérifier que le plan est valide
            if (!['free', 'standard', 'premium'].includes(subscription)) {
                return res.status(400).json({ message: 'Invalid subscription plan' });
            }
            const company = await CompanyModel_1.CompanyModel.findByIdAndUpdate(id, { subscription }, { new: true });
            if (!company) {
                return res.status(404).json({ message: 'Company not found' });
            }
            res.status(200).json(company);
        }
        catch (error) {
            console.error('Error updating subscription:', error);
            res.status(500).json({ message: 'Error updating subscription' });
        }
    }
    async getCompanyByUserId(req, res, next) {
        try {
            const company = await companyService.getCompanyByUserId(req.params.userId);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found for this user',
                });
            }
            res.status(200).json({
                success: true,
                message: 'Company retrieved successfully',
                data: company,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCompanyDetails(req, res, next) {
        try {
            const company = await companyService.getCompanyDetails(req.params.id);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company details not found',
                });
            }
            res.status(200).json({
                success: true,
                message: 'Company details retrieved successfully',
                data: company,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CompanyController = CompanyController;
