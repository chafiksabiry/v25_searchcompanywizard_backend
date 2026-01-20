"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const companySchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    industry: String,
    founded: String,
    headquarters: String,
    overview: { type: String, required: true },
    mission: String,
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
exports.CompanyModel = mongoose_1.default.model('Company', companySchema);
