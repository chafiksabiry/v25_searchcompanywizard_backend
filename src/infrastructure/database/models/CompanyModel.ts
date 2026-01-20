import mongoose from 'mongoose';
import { Company } from '../../../domain/entities/Company';

const companySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, default: null },
  name: { type: String, required: true },
  logo: String,
  industry: String,
  founded: String,
  headquarters: String,
  overview: { type: String, required: true },
  companyIntro: String,
  mission: String,
  subscription: {
    type: String,
    enum: ['free', 'standard', 'premium'],
    default: 'free'
  },
  culture: {
    values: [String],
    benefits: [String],
    workEnvironment: String
  },
  opportunities: {
    roles: [String],
    growthPotential: String,
    training: String
  },
  technology: {
    stack: [String],
    innovation: String
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
  }
}, {
  timestamps: true
});

export const CompanyModel = mongoose.model<Company>('Company', companySchema);
