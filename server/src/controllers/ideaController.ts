import { Response } from "express";
import { z } from "zod";
import { Idea, computeChecklistHash, IFeature } from "../models/Idea.js";
import { aiClient } from "../services/aiClient.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export const createIdeaSchema = z.object({
  rawText: z
    .string()
    .min(30, "Idea description must be at least 30 characters")
    .max(2000, "Idea description cannot exceed 2000 characters"),
});

const featureSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  plainDescription: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  priority: z.enum(["must", "nice"]).default("must"),
});

export const updateIdeaSchema = z.object({
  status: z.enum(["draft", "confirmed", "searching", "done"]).optional(),
  summary: z.string().optional(),
  targetUsers: z.array(z.string()).optional(),
  features: z.array(featureSchema).optional(),
});

/**
 * Submit a raw English idea, refine via AI client, save in draft state.
 */
export async function createIdea(req: AuthenticatedRequest, res: Response) {
  const { rawText } = req.body;
  const user = req.user!;

  // Call AI service to refine idea into feature checklist
  const refined = await aiClient.refineIdea(rawText);

  const idea = await Idea.create({
    userId: user._id,
    rawText,
    refined,
    status: "draft",
    checklistHash: computeChecklistHash(refined.features),
  });

  return res.status(201).json(idea);
}

/**
 * List all ideas submitted by current user.
 */
export async function getIdeas(req: AuthenticatedRequest, res: Response) {
  const user = req.user!;
  const ideas = await Idea.find({ userId: user._id }).sort({ createdAt: -1 });
  return res.json(ideas);
}

/**
 * Get single idea by ID (enforces ownership or admin role).
 */
export async function getIdeaById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  const idea = await Idea.findById(id);
  if (!idea) {
    return res.status(404).json({ error: "Idea not found" });
  }

  if (!idea.userId.equals(user._id) && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: You do not own this idea" });
  }

  return res.json(idea);
}

/**
 * Edit checklist features and confirm checklist (recomputes checklistHash).
 */
export async function updateIdea(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const user = req.user!;
  const { status, summary, targetUsers, features } = req.body;

  const idea = await Idea.findById(id);
  if (!idea) {
    return res.status(404).json({ error: "Idea not found" });
  }

  if (!idea.userId.equals(user._id) && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: You do not own this idea" });
  }

  if (summary !== undefined) {
    idea.refined.summary = summary;
  }
  if (targetUsers !== undefined) {
    idea.refined.targetUsers = targetUsers;
  }
  if (features !== undefined) {
    idea.refined.features = features as IFeature[];
    idea.checklistHash = computeChecklistHash(idea.refined.features);
  }
  if (status !== undefined) {
    idea.status = status;
  }

  await idea.save();
  return res.json(idea);
}
