import { Router } from "express";
import {
  triggerRepositoryAnalysis,
  triggerAnalysisSchema,
} from "../controllers/analysisController.js";
import { Repository } from "../models/Repository.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const repositoryRouter = Router();

repositoryRouter.use(requireAuth);

/**
 * Trigger an on-demand analysis for a repository against an idea.
 * POST /api/repositories/:id/analyze
 */
repositoryRouter.post(
  "/:id/analyze",
  validateBody(triggerAnalysisSchema),
  triggerRepositoryAnalysis
);

/**
 * Get repository metadata by ID.
 * GET /api/repositories/:id
 */
repositoryRouter.get("/:id", async (req, res) => {
  const repo = await Repository.findById(req.params.id);
  if (!repo) {
    return res.status(404).json({ error: "Repository not found" });
  }
  return res.json(repo);
});
