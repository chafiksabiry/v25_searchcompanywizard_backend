import mongoose, { Schema, Document } from 'mongoose';

interface Step {
  id: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: Date;
  disabled?: boolean;
}

interface Phase {
  id: number;
  status: 'pending' | 'in_progress' | 'completed';
  steps: Step[];
}

export interface IOnboardingProgress extends Document {
  companyId: mongoose.Types.ObjectId;
  currentPhase: number;
  completedSteps: number[];
  phases: Phase[];
  updatedAt: Date;
}

const OnboardingProgressSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  currentPhase: {
    type: Number,
    default: 1
  },
  completedSteps: [{
    type: Number
  }],
  phases: [{
    id: Number,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    },
    steps: [{
      id: Number,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      },
      completedAt: Date,
      disabled: Boolean
    }]
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour mettre à jour la date de modification
OnboardingProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const OnboardingProgress = mongoose.model<IOnboardingProgress>('OnboardingProgress', OnboardingProgressSchema); 