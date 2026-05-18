"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = require("./infrastructure/database/mongoose");
const companyRoutes_1 = require("./infrastructure/routes/companyRoutes");
const onboardingProgressRoutes_1 = require("./infrastructure/routes/onboardingProgressRoutes");
const openaiRoutes_1 = require("./infrastructure/routes/openaiRoutes");
const app = (0, express_1.default)();
const port = process.env.PORT || 5001;
// Middleware
app.enable('trust proxy'); // Required for Railway/Heroku proxies
const allowedOrigins = [
    'https://harx25pageslinks.netlify.app',
    'https://harx25register.netlify.app',
    'http://localhost:5173',
    'http://localhost:4000',
    'http://localhost:3000'
];
app.use((0, cors_1.default)({
    // Temporarily allow all for debugging 502s, then restrict back
    origin: true,
    credentials: true
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// Routes
app.use('/api/companies', companyRoutes_1.companyRoutes);
app.use('/api/openai', openaiRoutes_1.openaiRoutes);
app.use('/api/onboarding', onboardingProgressRoutes_1.onboardingProgressRoutes);
// Start server
const startServer = async () => {
    try {
        const dbConnected = await (0, mongoose_1.connectDB)();
        if (!dbConnected) {
            console.warn('⚠️  Server starting WITHOUT Database connection.');
        }
        // Explicitly bind to 0.0.0.0 for Docker/Railway
        const server = app.listen(Number(port), '0.0.0.0', () => {
            console.log(`Server running on port ${port} and bounded to 0.0.0.0`);
            if (!dbConnected) {
                console.log('⚠️  NOTE: Database is NOT connected. API calls requiring DB will fail.');
            }
        });
        // Fix for 502 Bad Gateway errors behind Load Balancers (Railway/AWS/Nginx)
        // Node.js default is 5s, LB is usually 60s. If Node closes connection while LB is reusing it => 502.
        server.keepAliveTimeout = 120 * 1000;
        server.headersTimeout = 120 * 1000;
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
