"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingProgressRoutes = void 0;
const express_1 = require("express");
const onboardingProgressController_1 = require("../controllers/onboardingProgressController");
const router = (0, express_1.Router)();
exports.onboardingProgressRoutes = router;
const onboardingProgressController = new onboardingProgressController_1.OnboardingProgressController();
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
