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
const errorHandler_1 = require("./infrastructure/middleware/errorHandler");
const companyRoutes_1 = require("./infrastructure/routes/companyRoutes");
// import { userRoutes } from './infrastructure/routes/userRoutes';
const app = (0, express_1.default)();
const port = process.env.PORT || 5001;
// Middleware
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// Routes
app.use('/api/companies', companyRoutes_1.companyRoutes);
// app.use('/api/users', userRoutes);
// Error handling
app.use(errorHandler_1.errorHandler);
// Start server
const startServer = async () => {
    try {
        await (0, mongoose_1.connectDB)();
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
