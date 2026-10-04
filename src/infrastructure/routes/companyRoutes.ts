import { Router } from 'express';
import { CompanyController } from '../controllers/companyController';
import { validateCompany } from '../middleware/validation';

const router = Router();
const companyController = new CompanyController();

router.post('/', validateCompany, companyController.createCompany);
router.get('/', companyController.getAllCompanies);
// Static segments before /:id
router.get('/user/:userId', companyController.getCompanyByUserId);
router.get('/:id/details', companyController.getCompanyDetails);
router.get('/:id', companyController.getCompanyById);
router.put('/:id', validateCompany, companyController.updateCompany);
router.put('/:id/subscription', companyController.updateSubscription);
router.delete('/:id', companyController.deleteCompany);

export { router as companyRoutes };
