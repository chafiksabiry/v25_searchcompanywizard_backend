"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (error, req, res, next) => {
    logger_1.logger.error('Error:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation Error',
            details: error.message
        });
    }
    if (error.name === 'MongoError' && error.code === 11000) {
        return res.status(409).json({
            message: 'Duplicate Entry',
            details: 'A resource with that unique identifier already exists'
        });
    }
    res.status(500).json({
        message: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};
exports.errorHandler = errorHandler;
