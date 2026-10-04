export type LocalizedString = { en?: string; fr?: string };
export type LocalizedStringList = { en?: string[]; fr?: string[] };

export interface Company {
  id?: string;
  name: string;
  logo?: string;
  industry?: string;
  industry_i18n?: LocalizedString;
  founded?: string;
  headquarters?: string;
  overview: string;
  overview_i18n?: LocalizedString;
  companyIntro?: string;
  companyIntro_i18n?: LocalizedString;
  mission?: string;
  mission_i18n?: LocalizedString;
  culture: {
    values: string[];
    values_i18n?: LocalizedStringList;
    benefits: string[];
    benefits_i18n?: LocalizedStringList;
    workEnvironment: string;
    workEnvironment_i18n?: LocalizedString;
  };
  opportunities: {
    roles: string[];
    roles_i18n?: LocalizedStringList;
    growthPotential: string;
    growthPotential_i18n?: LocalizedString;
    training: string;
    training_i18n?: LocalizedString;
  };
  technology: {
    stack: string[];
    innovation: string;
    innovation_i18n?: LocalizedString;
  };
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  socialMedia: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  differentiators?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
