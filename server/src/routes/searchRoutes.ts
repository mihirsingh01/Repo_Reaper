import { Router } from "express";
import { searchIdea, getSearchResults } from "../controllers/searchController.js";
import { getFounderBrief } from "../controllers/analysisController.js";
import { requireAuth } from "../middleware/auth.js";
import { checkAiKillSwitch } from "../middleware/killSwitch.js";

export const searchRouter = Router();

searchRouter.use(requireAuth);

searchRouter.post("/:id/search", checkAiKillSwitch, searchIdea);
searchRouter.get("/:id/results", getSearchResults);
searchRouter.get("/:id/brief", getFounderBrief);
