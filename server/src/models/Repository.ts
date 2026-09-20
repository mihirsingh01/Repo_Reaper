import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRepositoryLicense {
  spdx: string | null;
  name: string;
}

export interface IRepository extends Document {
  _id: mongoose.Types.ObjectId;
  githubId: number;
  fullName: string;
  url: string;
  description: string;
  topics: string[];
  language: string;
  license: IRepositoryLicense;
  stars: number;
  forks: number;
  openIssues: number;
  openBugIssues: number;
  closedBugIssues: number;
  lastCiConclusion: string | null;
  defaultBranch: string;
  archived: boolean;
  createdAt: Date;
  pushedAt: Date;
  lastCommitAt: Date;
  commitCount: number;
  contributorCount: number;
  readmeText: string;
  readmeHash: string;
  etag?: string;
  fetchedAt: Date;
  indexedAt?: Date;
}

const RepositoryLicenseSchema = new Schema<IRepositoryLicense>(
  {
    spdx: { type: String, default: null },
    name: { type: String, default: "" },
  },
  { _id: false }
);

const RepositorySchema = new Schema<IRepository>(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    fullName: { type: String, required: true, index: true },
    url: { type: String, required: true },
    description: { type: String, default: "" },
    topics: { type: [String], default: [] },
    language: { type: String, default: "Unknown", index: true },
    license: { type: RepositoryLicenseSchema, default: () => ({ spdx: null, name: "" }) },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    openIssues: { type: Number, default: 0 },
    openBugIssues: { type: Number, default: 0 },
    closedBugIssues: { type: Number, default: 0 },
    lastCiConclusion: { type: String, default: null },
    defaultBranch: { type: String, default: "main" },
    archived: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    pushedAt: { type: Date, required: true },
    lastCommitAt: { type: Date, required: true, index: true },
    commitCount: { type: Number, default: 0 },
    contributorCount: { type: Number, default: 0 },
    readmeText: { type: String, default: "" },
    readmeHash: { type: String, default: "" },
    etag: { type: String, default: "" },
    fetchedAt: { type: Date, default: Date.now },
    indexedAt: { type: Date },
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const Repository: Model<IRepository> =
  mongoose.models.Repository || mongoose.model<IRepository>("Repository", RepositorySchema);
