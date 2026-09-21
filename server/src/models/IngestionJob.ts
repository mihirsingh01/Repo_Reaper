import mongoose, { Schema, Document, Model } from "mongoose";

export type IngestionJobStatus = "queued" | "running" | "done" | "failed";

export interface IIngestionJob extends Document {
  _id: mongoose.Types.ObjectId;
  status: IngestionJobStatus;
  params: {
    language?: string;
    window?: string;
  };
  counts: {
    seen: number;
    kept: number;
    rejected: number;
    byReason: Record<string, number>;
  };
  startedAt?: Date;
  finishedAt?: Date;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const IngestionJobSchema = new Schema<IIngestionJob>(
  {
    status: {
      type: String,
      enum: ["queued", "running", "done", "failed"],
      default: "queued",
      index: true,
    },
    params: {
      language: { type: String },
      window: { type: String },
    },
    counts: {
      seen: { type: Number, default: 0 },
      kept: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
      byReason: { type: Schema.Types.Mixed, default: {} },
    },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    error: { type: String, default: null },
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

export const IngestionJob: Model<IIngestionJob> =
  mongoose.models.IngestionJob ||
  mongoose.model<IIngestionJob>("IngestionJob", IngestionJobSchema);
