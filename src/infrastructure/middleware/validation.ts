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


const companySchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1),
  logo: optionalUrl,
  industry: z.string().optional(),
  founded: z.string().optional(),
  headquarters: z.string().optional(),
  overview: z.string().min(1),
  mission: z.string().optional(),
  culture: z.object({
    values: z.array(z.string()).optional().default([]),
    benefits: z.array(z.string()).optional().default([]),
    workEnvironment: z.string().optional().default("")
  }).optional().default({}),
  opportunities: z.object({
    roles: z.array(z.string()).optional().default([]),
    growthPotential: z.string().optional().default(""),
    training: z.string().optional().default("")
  }).optional().default({}),
  technology: z.object({
    stack: z.array(z.string()).optional().default([]),
    innovation: z.string().optional().default("")
  }).optional().default({}),
  contact: contactSchema.optional().default({}),
  socialMedia: socialMediaSchema.optional().default({}),
  differentiators: z.array(z.string()).optional().default([])
});

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