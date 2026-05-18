"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiRoutes = void 0;
const express_1 = require("express");
const openaiController_1 = require("../controllers/openaiController");
const router = (0, express_1.Router)();
exports.openaiRoutes = router;
const openaiController = new openaiController_1.OpenAIController();
// Route pour rechercher le logo d'une entreprise
router.post('/search-logo', (req, res, next) => {
    openaiController.searchCompanyLogo(req, res, next);
});
// Route pour rechercher des entreprises via Google (Proxy)
router.post('/search', (req, res, next) => {
    openaiController.searchCompanies(req, res, next);
});
// Route pour générer un profil d'entreprise complet
router.post('/generate-profile', (req, res, next) => {
    openaiController.generateCompanyProfile(req, res, next);
});
// Route pour générer les catégories d'unicité
router.post('/generate-uniqueness', (req, res, next) => {
    openaiController.generateUniquenessCategories(req, res, next);
});
