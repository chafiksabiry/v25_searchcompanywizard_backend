"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRoutes = void 0;
const express_1 = require("express");
const MongoCompanyRepository_1 = require("../repositories/MongoCompanyRepository");
const CreateCompanyUseCase_1 = require("../../application/use-cases/company/CreateCompanyUseCase");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
exports.companyRoutes = router;
const companyRepository = new MongoCompanyRepository_1.MongoCompanyRepository();
const createCompanyUseCase = new CreateCompanyUseCase_1.CreateCompanyUseCase(companyRepository);
router.post('/', validation_1.validateCompany, async (req, res, next) => {
    try {
        const company = await createCompanyUseCase.execute(req.body);
        res.status(201).json(company);
    }
    catch (error) {
        next(error);
    }
});
router.get('/', async (req, res, next) => {
    try {
        const companies = await companyRepository.findAll();
        res.json(companies);
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const company = await companyRepository.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }
        res.json(company);
    }
    catch (error) {
        next(error);
    }
});
