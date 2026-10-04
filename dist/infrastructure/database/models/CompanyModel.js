"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const i18nStringSchema = {
    en: { type: String, required: false },
    fr: { type: String, required: false },
};
const i18nStringListSchema = {
    en: [{ type: String }],
    fr: [{ type: String }],
};
const companySchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, default: null },
    name: { type: String, required: true },
    logo: String,
    industry: String,
    industry_i18n: i18nStringSchema,
    founded: String,
    headquarters: String,
    overview: { type: String, required: true },
    overview_i18n: i18nStringSchema,
    companyIntro: String,
    companyIntro_i18n: i18nStringSchema,
    mission: String,
    mission_i18n: i18nStringSchema,
    subscription: {
        type: String,
        enum: ['free', 'standard', 'premium'],
        default: 'free'
    },
    culture: {
        values: [String],
        values_i18n: i18nStringListSchema,
        benefits: [String],
        benefits_i18n: i18nStringListSchema,
        workEnvironment: String,
        workEnvironment_i18n: i18nStringSchema,
    },
    opportunities: {
        roles: [String],
        roles_i18n: i18nStringListSchema,
        growthPotential: String,
        growthPotential_i18n: i18nStringSchema,
        training: String,
        training_i18n: i18nStringSchema,
    },
    technology: {
        stack: [String],
        innovation: String,
        innovation_i18n: i18nStringSchema,
    },
    contact: {
        email: String,
        phone: String,
        address: String,
        website: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    socialMedia: {
        linkedin: String,
        twitter: String,
        facebook: String,
        instagram: String
    },
    differentiators: [String]
}, {
    timestamps: true
});
exports.CompanyModel = mongoose_1.default.model('Company', companySchema);
