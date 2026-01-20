"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCompany = void 0;
const zod_1 = require("zod");
const coordinatesSchema = zod_1.z.object({
    lat: zod_1.z.number(),
    lng: zod_1.z.number()
}).optional();
const contactSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    website: zod_1.z.string().url().optional(),
    coordinates: coordinatesSchema
});
const socialMediaSchema = zod_1.z.object({
    linkedin: zod_1.z.string().url().optional(),
    twitter: zod_1.z.string().url().optional(),
    facebook: zod_1.z.string().url().optional(),
    instagram: zod_1.z.string().url().optional()
});
const companySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    industry: zod_1.z.string().optional(),
    founded: zod_1.z.string().optional(),
    headquarters: zod_1.z.string().optional(),
    overview: zod_1.z.string().min(1),
    mission: zod_1.z.string().optional(),
    culture: zod_1.z.object({
        values: zod_1.z.array(zod_1.z.string()),
        benefits: zod_1.z.array(zod_1.z.string()),
        workEnvironment: zod_1.z.string()
    }),
    opportunities: zod_1.z.object({
        roles: zod_1.z.array(zod_1.z.string()),
        growthPotential: zod_1.z.string(),
        training: zod_1.z.string()
    }),
    technology: zod_1.z.object({
        stack: zod_1.z.array(zod_1.z.string()),
        innovation: zod_1.z.string()
    }),
    contact: contactSchema,
    socialMedia: socialMediaSchema
});
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
