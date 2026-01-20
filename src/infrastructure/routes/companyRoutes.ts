import { Router } from 'express';
import { CompanyController } from '../controllers/companyController';
import { validateCompany } from '../middleware/validation';

const router = Router();
const companyController = new CompanyController();

router.post('/', validateCompany, companyController.createCompany);
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.get('/:id/details', companyController.getCompanyDetails);
router.get('/user/:userId', companyController.getCompanyByUserId);
router.put('/:id', validateCompany, companyController.updateCompany);
router.put('/:id/subscription', companyController.updateSubscription);
router.delete('/:id', companyController.deleteCompany);

export { router as companyRoutes };
