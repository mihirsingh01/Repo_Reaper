import mongoose, { Schema, Document, Model } from "mongoose";
import crypto from "crypto";

export type FeaturePriority = "must" | "nice";
export type IdeaStatus = "draft" | "confirmed" | "searching" | "done";

export interface IFeature {
  id: string;
  label: string;
  plainDescription: string;
  keywords: string[];
  priority: FeaturePriority;
}

export interface IRefinedIdea {
  summary: string;
  targetUsers: string[];
  features: IFeature[];
}

export interface IIdea extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rawText: string;
  refined: IRefinedIdea;
  status: IdeaStatus;
  checklistHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureSchema = new Schema<IFeature>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    plainDescription: { type: String, required: true },
    keywords: { type: [String], default: [] },
    priority: { type: String, enum: ["must", "nice"], default: "must" },
  },
  { _id: false }
);

const IdeaSchema = new Schema<IIdea>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rawText: {
      type: String,
      required: true,
      minlength: 30,
      maxlength: 2000,
    },
    refined: {
      summary: { type: String, default: "" },
      targetUsers: { type: [String], default: [] },
      features: { type: [FeatureSchema], default: [] },
    },
    status: {
      type: String,
      enum: ["draft", "confirmed", "searching", "done"],
      default: "draft",
    },
    checklistHash: { type: String, default: "", index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Compound index for user history retrieval
IdeaSchema.index({ userId: 1, createdAt: -1 });

/**
 * Computes a deterministic SHA-256 hash of confirmed checklist features.
 * Normalizes by sorting by id to ensure order-independence.
 */
export function computeChecklistHash(features: IFeature[]): string {
  const normalized = [...features]
    .map((f) => ({
      id: f.id.trim(),
      label: f.label.trim().toLowerCase(),
      priority: f.priority,
      keywords: [...(f.keywords || [])].map((k) => k.trim().toLowerCase()).sort(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export const Idea: Model<IIdea> =
  mongoose.models.Idea || mongoose.model<IIdea>("Idea", IdeaSchema);
