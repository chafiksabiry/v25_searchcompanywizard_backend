"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRoutes = void 0;
const express_1 = require("express");
const companyController_1 = require("../controllers/companyController");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
exports.companyRoutes = router;
const companyController = new companyController_1.CompanyController();
router.post('/', validation_1.validateCompany, companyController.createCompany);
router.get('/', companyController.getAllCompanies);
// Static segments before /:id
router.get('/user/:userId', companyController.getCompanyByUserId);
router.get('/:id/details', companyController.getCompanyDetails);
router.get('/:id', companyController.getCompanyById);
router.put('/:id', validation_1.validateCompany, companyController.updateCompany);
router.put('/:id/subscription', companyController.updateSubscription);
router.delete('/:id', companyController.deleteCompany);
