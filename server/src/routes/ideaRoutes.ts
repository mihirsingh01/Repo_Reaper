import { Router } from "express";
import {
  createIdea,
  getIdeas,
  getIdeaById,
  updateIdea,
  createIdeaSchema,
  updateIdeaSchema,
} from "../controllers/ideaController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { checkAiKillSwitch } from "../middleware/killSwitch.js";

export const ideaRouter = Router();

ideaRouter.use(requireAuth);

ideaRouter.post("/", checkAiKillSwitch, validateBody(createIdeaSchema), createIdea);
ideaRouter.get("/", getIdeas);
ideaRouter.get("/:id", getIdeaById);
ideaRouter.patch("/:id", validateBody(updateIdeaSchema), updateIdea);
