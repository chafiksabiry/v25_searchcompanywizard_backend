"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCompany = void 0;
const zod_1 = require("zod");
const optionalUrl = zod_1.z.string().optional();
const coordinatesSchema = zod_1.z.object({
    lat: zod_1.z.number().optional(),
    lng: zod_1.z.number().optional()
}).optional();
const contactSchema = zod_1.z.object({
    email: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    website: optionalUrl,
    coordinates: coordinatesSchema
}).optional();
const socialMediaSchema = zod_1.z.object({
    linkedin: optionalUrl,
    twitter: optionalUrl,
    facebook: optionalUrl,
    instagram: optionalUrl
}).optional();
const i18nStringSchema = zod_1.z
    .object({
    en: zod_1.z.string().optional(),
    fr: zod_1.z.string().optional(),
})
    .optional();
const i18nStringListSchema = zod_1.z
    .object({
    en: zod_1.z.array(zod_1.z.string()).optional(),
    fr: zod_1.z.array(zod_1.z.string()).optional(),
})
    .optional();
const companySchema = zod_1.z
    .object({
    userId: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1),
    logo: optionalUrl,
    industry: zod_1.z.string().optional(),
    industry_i18n: i18nStringSchema,
    founded: zod_1.z.string().optional(),
    headquarters: zod_1.z.string().optional(),
    overview: zod_1.z.string().min(1),
    overview_i18n: i18nStringSchema,
    mission: zod_1.z.string().optional(),
    mission_i18n: i18nStringSchema,
    companyIntro: zod_1.z.string().optional(),
    companyIntro_i18n: i18nStringSchema,
    culture: zod_1.z
        .object({
        values: zod_1.z.array(zod_1.z.string()).optional().default([]),
        values_i18n: i18nStringListSchema,
        benefits: zod_1.z.array(zod_1.z.string()).optional().default([]),
        benefits_i18n: i18nStringListSchema,
        workEnvironment: zod_1.z.string().optional().default(""),
        workEnvironment_i18n: i18nStringSchema,
    })
        .optional()
        .default({}),
    opportunities: zod_1.z
        .object({
        roles: zod_1.z.array(zod_1.z.string()).optional().default([]),
        roles_i18n: i18nStringListSchema,
        growthPotential: zod_1.z.string().optional().default(""),
        growthPotential_i18n: i18nStringSchema,
        training: zod_1.z.string().optional().default(""),
        training_i18n: i18nStringSchema,
    })
        .optional()
        .default({}),
    technology: zod_1.z
        .object({
        stack: zod_1.z.array(zod_1.z.string()).optional().default([]),
        innovation: zod_1.z.string().optional().default(""),
        innovation_i18n: i18nStringSchema,
    })
        .optional()
        .default({}),
    contact: contactSchema.optional().default({}),
    socialMedia: socialMediaSchema.optional().default({}),
    differentiators: zod_1.z.array(zod_1.z.string()).optional().default([]),
})
    .passthrough();
const validateCompany = (req, res, next) => {
    try {
        companySchema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                message: 'Validation Error',
                details: error.errors
            });
        }
        else {
            next(error);
        }
    }
};
exports.validateCompany = validateCompany;
