import { Request, Response, NextFunction } from "express";
import { metrics } from "../utils/metrics.js";

/**
 * Middleware to enforce the global LLM spend kill-switch.
 * Rejects requests that trigger expensive LLM inference or agent orchestration.
 */
export function checkAiKillSwitch(req: Request, res: Response, next: NextFunction) {
  if (metrics.isKillSwitchActive()) {
    return res.status(503).json({
      error: "AI operations are temporarily halted by administrator spend kill-switch",
      code: "LLM_SPEND_KILL_SWITCH_ACTIVE",
      timestamp: new Date().toISOString(),
    });
  }
  next();
}
