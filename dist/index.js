"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose_2 = require("./infrastructure/database/mongoose");
const companyRoutes_1 = require("./infrastructure/routes/companyRoutes");
const onboardingProgressRoutes_1 = require("./infrastructure/routes/onboardingProgressRoutes");
const openaiRoutes_1 = require("./infrastructure/routes/openaiRoutes");
const uploadsRoutes_1 = require("./infrastructure/routes/uploadsRoutes");
const app = (0, express_1.default)();
const port = process.env.PORT || 5001;
// Middleware
app.enable('trust proxy'); // Required for Railway/Heroku proxies
const allowedOrigins = [
    'https://harx.ai',
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
// Database connection health check middleware
app.use((req, res, next) => {
    if (req.path.startsWith('/api/uploads'))
        return next();
    if (mongoose_1.default.connection.readyState !== 1 || !mongoose_1.default.connection.db) {
        return res.status(503).json({
            success: false,
            message: "Base de données non connectée. Veuillez réessayer dans quelques instants."
        });
    }
    next();
});
// Routes
app.use('/api/companies', companyRoutes_1.companyRoutes);
app.use('/api/openai', openaiRoutes_1.openaiRoutes);
app.use('/api/onboarding', onboardingProgressRoutes_1.onboardingProgressRoutes);
app.use('/api/uploads', uploadsRoutes_1.uploadsRoutes);
// Start server
const startServer = () => {
    try {
        // Explicitly bind to 0.0.0.0 for Docker/Railway immediately
        const server = app.listen(Number(port), '0.0.0.0', () => {
            console.log(`✅ Server running on port ${port} and bounded to 0.0.0.0`);
            // Connect to MongoDB asynchronously in the background to avoid blocking the port binding
            (0, mongoose_2.connectDB)().then((dbConnected) => {
                if (!dbConnected) {
                    console.warn('⚠️  Database connection failed. API calls requiring DB will fail.');
                }
                else {
                    console.log('✅ Database connection established asynchronously.');
                }
            });
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
