"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadsController = exports.UploadsController = void 0;
const cloudinary_1 = require("cloudinary");
const isConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET);
if (isConfigured) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}
function uploadBuffer(buffer, options = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder: options.folder || 'harx/companies/logos',
            public_id: options.publicId,
            resource_type: 'image',
            overwrite: true,
        }, (error, result) => {
            if (error || !result)
                return reject(error || new Error('Upload failed'));
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
        });
        stream.end(buffer);
    });
}
class UploadsController {
    constructor() {
        this.uploadImage = async (req, res) => {
            try {
                if (!isConfigured) {
                    return res.status(500).json({
                        success: false,
                        message: 'Cloudinary is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
                    });
                }
                const file = req.file;
                if (!file) {
                    return res.status(400).json({ success: false, message: 'No file provided (field name: "file").' });
                }
                if (!file.mimetype.startsWith('image/')) {
                    return res.status(400).json({ success: false, message: 'Only image files are allowed.' });
                }
                if (file.size > 5 * 1024 * 1024) {
                    return res.status(400).json({ success: false, message: 'File too large (max 5 MB).' });
                }
                const folder = typeof req.body?.folder === 'string' && req.body.folder
                    ? req.body.folder
                    : 'harx/companies/logos';
                const result = await uploadBuffer(file.buffer, { folder });
                return res.status(200).json({
                    success: true,
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
            catch (err) {
                console.error('[uploads] image upload error:', err);
                return res.status(500).json({
                    success: false,
                    message: err?.message || 'Failed to upload image',
                });
            }
        };
    }
}
exports.UploadsController = UploadsController;
exports.uploadsController = new UploadsController();
