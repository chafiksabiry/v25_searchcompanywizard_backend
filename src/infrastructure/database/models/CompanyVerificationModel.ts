import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['verified', 'rejected'], required: true },
    reason: String,
    fileName: String,
    mimeType: String,
    /** Private (authenticated) storage reference; never exposed through the API. */
    storageId: String,
    storageResource: String,
    extracted: mongoose.Schema.Types.Mixed,
    uploadedAt: Date,
    checkedAt: Date,
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    documents: {
      kbis: documentSchema,
      address_proof: documentSchema,
      manager_id: documentSchema,
    },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
  },
  { timestamps: true }
);

export const CompanyVerificationModel = mongoose.model('CompanyVerification', verificationSchema);
