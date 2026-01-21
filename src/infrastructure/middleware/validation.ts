import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional();

const coordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number()
}).optional();

const contactSchema = z.object({
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: optionalUrl,
  coordinates: coordinatesSchema
});

const socialMediaSchema = z.object({
  linkedin: optionalUrl,
  twitter: optionalUrl,
  facebook: optionalUrl,
  instagram: optionalUrl
});


const companySchema = z.object({
  name: z.string().min(1),
  logo: optionalUrl,
  industry: z.string().optional(),
  founded: z.string().optional(),
  headquarters: z.string().optional(),
  overview: z.string().min(1),
  mission: z.string().optional(),
  culture: z.object({
    values: z.array(z.string()),
    benefits: z.array(z.string()),
    workEnvironment: z.string()
  }),
  opportunities: z.object({
    roles: z.array(z.string()),
    growthPotential: z.string(),
    training: z.string()
  }),
  technology: z.object({
    stack: z.array(z.string()),
    innovation: z.string()
  }),
  contact: contactSchema,
  socialMedia: socialMediaSchema
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