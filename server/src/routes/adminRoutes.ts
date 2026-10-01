import { Router } from "express";
import {
  triggerIngestion,
  getIngestionStatus,
  getSystemStatus,
  updateKillSwitch,
  triggerIngestSchema,
  killSwitchSchema,
} from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const adminRouter = Router();

// Secure all admin routes with authentication and admin role check
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.post("/ingest", validateBody(triggerIngestSchema), triggerIngestion);
adminRouter.get("/ingest/:jobId", getIngestionStatus);
adminRouter.get("/system-status", getSystemStatus);
adminRouter.post("/kill-switch", validateBody(killSwitchSchema), updateKillSwitch);
