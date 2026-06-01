"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadsRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uploadsController_1 = require("../controllers/uploadsController");
const router = (0, express_1.Router)();
exports.uploadsRoutes = router;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new Error('Only image files are allowed'));
    },
});
router.post('/image', upload.single('file'), uploadsController_1.uploadsController.uploadImage);
