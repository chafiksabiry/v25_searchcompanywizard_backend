import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const optionalUrl = z.string().optional();

const coordinatesSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional()
}).optional();

const contactSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: optionalUrl,
  coordinates: coordinatesSchema
}).optional();

const socialMediaSchema = z.object({
  linkedin: optionalUrl,
  twitter: optionalUrl,
  facebook: optionalUrl,
  instagram: optionalUrl
}).optional();


const i18nStringSchema = z
  .object({
    en: z.string().optional(),
    fr: z.string().optional(),
  })
  .optional();

const i18nStringListSchema = z
  .object({
    en: z.array(z.string()).optional(),
    fr: z.array(z.string()).optional(),
  })
  .optional();

const companySchema = z
  .object({
    userId: z.string().optional(),
    name: z.string().min(1),
    logo: optionalUrl,
    industry: z.string().optional(),
    industry_i18n: i18nStringSchema,
    founded: z.string().optional(),
    headquarters: z.string().optional(),
    overview: z.string().min(1),
    overview_i18n: i18nStringSchema,
    mission: z.string().optional(),
    mission_i18n: i18nStringSchema,
    companyIntro: z.string().optional(),
    companyIntro_i18n: i18nStringSchema,
    culture: z
      .object({
        values: z.array(z.string()).optional().default([]),
        values_i18n: i18nStringListSchema,
        benefits: z.array(z.string()).optional().default([]),
        benefits_i18n: i18nStringListSchema,
        workEnvironment: z.string().optional().default(""),
        workEnvironment_i18n: i18nStringSchema,
      })
      .optional()
      .default({}),
    opportunities: z
      .object({
        roles: z.array(z.string()).optional().default([]),
        roles_i18n: i18nStringListSchema,
        growthPotential: z.string().optional().default(""),
        growthPotential_i18n: i18nStringSchema,
        training: z.string().optional().default(""),
        training_i18n: i18nStringSchema,
      })
      .optional()
      .default({}),
    technology: z
      .object({
        stack: z.array(z.string()).optional().default([]),
        innovation: z.string().optional().default(""),
        innovation_i18n: i18nStringSchema,
      })
      .optional()
      .default({}),
    contact: contactSchema.optional().default({}),
    socialMedia: socialMediaSchema.optional().default({}),
    differentiators: z.array(z.string()).optional().default([]),
  })
  .passthrough();

export const validateCompany = (req: Request, res: Response, next: NextFunction) => {
  try {
    companySchema.parse(req.body);
    next();
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: 'Validation Error',
        details: error.errors
      });
    } else {
      next(error);
    }
  }
};