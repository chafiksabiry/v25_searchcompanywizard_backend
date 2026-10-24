import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { CompanyModel } from '../database/models/CompanyModel';
import { CompanyVerificationModel } from '../database/models/CompanyVerificationModel';
import { extractKybDocument, isKybAiConfigured } from '../services/kybAiService';
import { evaluateKybDocument, KYB_DOC_TYPES, KybDocType, KybExtraction } from '../utils/kybEvaluation';

const storageConfigured =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

if (storageConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function storePrivately(
  buffer: Buffer,
  companyId: string,
  type: KybDocType,
  isPdf: boolean
): Promise<{ publicId: string; resource: string }> {
  const resource_type = isPdf ? 'raw' : 'image';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `harx/kyb/${companyId}`,
        public_id: `${type}-${Date.now()}`,
        resource_type,
        type: 'authenticated',
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Storage failed'));
        resolve({ publicId: result.public_id, resource: resource_type });
      }
    );
    stream.end(buffer);
  });
}

/** Public shape: statuses and reason codes only, never the stored file or the extracted data. */
function toPublic(doc: any) {
  const documents: Record<string, unknown> = {};
  for (const type of KYB_DOC_TYPES) {
    const d = doc?.documents?.[type];
    documents[type] = d
      ? { status: d.status, reason: d.reason ?? null, fileName: d.fileName ?? null, uploadedAt: d.uploadedAt ?? null }
      : null;
  }
  return { verified: Boolean(doc?.verified), verifiedAt: doc?.verifiedAt ?? null, documents };
}

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class VerificationController {
  getStatus = async (req: Request, res: Response) => {
    const { companyId } = req.params;
    if (!isValidId(companyId)) return res.status(400).json({ success: false, message: 'Invalid company id' });
    const doc = await CompanyVerificationModel.findOne({ companyId }).lean();
    return res.json({ success: true, data: toPublic(doc) });
  };

  uploadDocument = async (req: Request, res: Response) => {
    try {
      const { companyId, type } = req.params;
      if (!isValidId(companyId)) return res.status(400).json({ success: false, message: 'Invalid company id' });
      if (!KYB_DOC_TYPES.includes(type as KybDocType)) {
        return res.status(400).json({ success: false, message: 'Unknown document type' });
      }
      const docType = type as KybDocType;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ success: false, message: 'No file provided (field name: "file").' });
      if (!isKybAiConfigured() || !storageConfigured) {
        return res.status(503).json({ success: false, code: 'unavailable', message: 'Verification is temporarily unavailable.' });
      }

      const company = await CompanyModel.findById(companyId).lean<any>();
      if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

      let extraction: KybExtraction;
      try {
        extraction = await extractKybDocument(file, docType);
      } catch (err: any) {
        console.error('[kyb] AI extraction failed:', err?.message);
        return res.status(502).json({ success: false, code: 'analysis_failed', message: 'The document could not be analysed.' });
      }

      let record = await CompanyVerificationModel.findOne({ companyId });
      if (!record) record = new CompanyVerificationModel({ companyId, documents: {} });
      const docs: any = record.documents;

      const stored = await storePrivately(file.buffer, companyId, docType, file.mimetype === 'application/pdf');
      const now = new Date();
      docs[docType] = {
        status: 'rejected',
        fileName: file.originalname,
        mimeType: file.mimetype,
        storageId: stored.publicId,
        storageResource: stored.resource,
        extracted: extraction,
        uploadedAt: now,
        checkedAt: now,
      };

      // Re-evaluate every document: the ID is cross-checked against the registration extract.
      const kbisX = docs.kbis?.extracted as KybExtraction | undefined;
      for (const t of KYB_DOC_TYPES) {
        const d = docs[t];
        if (!d?.extracted) continue;
        const result = evaluateKybDocument(t, d.extracted, {
          companyName: company.name,
          companyAddress: company.contact?.address,
          representatives: t === 'manager_id' ? kbisX?.representatives ?? [] : [],
          now,
        });
        d.status = result.status;
        d.reason = result.reason;
      }
      record.markModified('documents');

      const allVerified = KYB_DOC_TYPES.every((t) => docs[t]?.status === 'verified');
      if (allVerified && !record.verified) record.verifiedAt = now;
      record.verified = allVerified;
      await record.save();
      await CompanyModel.updateOne({ _id: companyId }, { $set: { kybVerified: allVerified } });

      return res.json({ success: true, data: toPublic(record.toObject()) });
    } catch (err: any) {
      console.error('[kyb] upload error:', err);
      return res.status(500).json({ success: false, message: 'Failed to process the document.' });
    }
  };
}

export const verificationController = new VerificationController();
