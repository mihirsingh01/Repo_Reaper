import { Router } from "express";
import { getAnalysisById } from "../controllers/analysisController.js";
import { requireAuth } from "../middleware/auth.js";

export const analysisRouter = Router();

analysisRouter.use(requireAuth);

analysisRouter.get("/:id", getAnalysisById);
