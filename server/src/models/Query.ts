import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQueryResult {
  repoId: mongoose.Types.ObjectId;
  relevance: number;
  matchedTerms: string[];
  analysisId?: mongoose.Types.ObjectId;
  coverage?: number;
  viability?: number;
  final?: number;
}

export interface IQuery extends Document {
  _id: mongoose.Types.ObjectId;
  ideaId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  expandedQuery: string;
  checklistHash: string;
  results: IQueryResult[];
  bestRepoId?: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

const QueryResultSchema = new Schema<IQueryResult>(
  {
    repoId: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
    relevance: { type: Number, required: true },
    matchedTerms: { type: [String], default: [] },
    analysisId: { type: Schema.Types.ObjectId, ref: "Analysis" },
    coverage: { type: Number },
    viability: { type: Number },
    final: { type: Number },
  },
  { _id: false }
);

const QuerySchema = new Schema<IQuery>(
  {
    ideaId: { type: Schema.Types.ObjectId, ref: "Idea", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expandedQuery: { type: String, required: true },
    checklistHash: { type: String, required: true },
    results: { type: [QueryResultSchema], default: [] },
    bestRepoId: { type: Schema.Types.ObjectId, ref: "Repository" },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// TTL index to automatically purge search cache after expiration
QuerySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound cache lookup index
QuerySchema.index({ ideaId: 1, checklistHash: 1 });

export const Query: Model<IQuery> =
  mongoose.models.Query || mongoose.model<IQuery>("Query", QuerySchema);
