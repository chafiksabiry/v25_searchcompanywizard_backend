"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/company-profiles';
        // Log providing a hint about the connection source without exposing full credentials
        const isLocal = mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1');
        console.log(`Connecting to MongoDB (${isLocal ? 'Local' : 'Remote/Cluster'})...`);
        if (!process.env.MONGODB_URI) {
            console.warn('⚠️  MONGODB_URI environment variable is not defined. Using default local instance.');
        }
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ MongoDB connected successfully');
        return true;
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        // Exit process with failure
        // process.exit(1); 
        // CHANGE: Return false instead of exiting, to keep server alive for debugging
        return false;
    }
};
exports.connectDB = connectDB;
