import { Router } from 'express';
import { OpenAIController } from '../controllers/openaiController';

const router = Router();
const openaiController = new OpenAIController();

// Route pour rechercher le logo d'une entreprise
router.post('/search-logo', (req: any, res: any, next: any) => {
  openaiController.searchCompanyLogo(req, res, next);
});

// Route pour générer un profil d'entreprise complet
router.post('/generate-profile', (req: any, res: any, next: any) => {
  openaiController.generateCompanyProfile(req, res, next);
});

// Route pour générer les catégories d'unicité
router.post('/generate-uniqueness', (req: any, res: any, next: any) => {
  openaiController.generateUniquenessCategories(req, res, next);
});

export { router as openaiRoutes };
