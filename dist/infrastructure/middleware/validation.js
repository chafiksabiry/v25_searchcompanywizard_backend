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
const companySchema = zod_1.z.object({
    userId: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1),
    logo: optionalUrl,
    industry: zod_1.z.string().optional(),
    founded: zod_1.z.string().optional(),
    headquarters: zod_1.z.string().optional(),
    overview: zod_1.z.string().min(1),
    mission: zod_1.z.string().optional(),
    culture: zod_1.z.object({
        values: zod_1.z.array(zod_1.z.string()).optional().default([]),
        benefits: zod_1.z.array(zod_1.z.string()).optional().default([]),
        workEnvironment: zod_1.z.string().optional().default("")
    }).optional().default({}),
    opportunities: zod_1.z.object({
        roles: zod_1.z.array(zod_1.z.string()).optional().default([]),
        growthPotential: zod_1.z.string().optional().default(""),
        training: zod_1.z.string().optional().default("")
    }).optional().default({}),
    technology: zod_1.z.object({
        stack: zod_1.z.array(zod_1.z.string()).optional().default([]),
        innovation: zod_1.z.string().optional().default("")
    }).optional().default({}),
    contact: contactSchema.optional().default({}),
    socialMedia: socialMediaSchema.optional().default({}),
    differentiators: zod_1.z.array(zod_1.z.string()).optional().default([])
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
