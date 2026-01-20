import { Router } from 'express';
import { OnboardingProgressController } from '../controllers/onboardingProgressController';

const router = Router();
const onboardingProgressController = new OnboardingProgressController();

// Obtenir le progrès d'onboarding par userId
router.get('/companies/:userId/onboardingProgress', onboardingProgressController.getProgressByUserId);

// Initialiser le progrès d'onboarding pour une entreprise
router.post('/companies/:companyId/onboarding', onboardingProgressController.initializeProgress);

// Obtenir le progrès d'onboarding d'une entreprise
router.get('/companies/:companyId/onboarding', onboardingProgressController.getProgress);

// Mettre à jour le progrès d'une étape
router.put('/companies/:companyId/onboarding/phases/:phaseId/steps/:stepId', onboardingProgressController.updateStepProgress);

// Mettre à jour la phase courante
router.put('/companies/:companyId/onboarding/current-phase', onboardingProgressController.updateCurrentPhase);

// Réinitialiser le progrès d'onboarding
router.post('/companies/:companyId/onboarding/reset', onboardingProgressController.resetProgress);

// Compléter automatiquement la dernière phase et le dernier step
router.put('/companies/:companyId/onboarding/complete-last', onboardingProgressController.completeLastPhaseAndStep);

// Réparer la phase courante basée sur l'état réel
router.put('/companies/:companyId/onboarding/fix-current-phase', onboardingProgressController.fixCurrentPhase);

export { router as onboardingProgressRoutes }; 