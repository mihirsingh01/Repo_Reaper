import { Router } from "express";
import {
  register,
  login,
  getMe,
  registerSchema,
  loginSchema,
} from "../controllers/authController.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), register);
authRouter.post("/login", authRateLimiter, validateBody(loginSchema), login);
authRouter.get("/me", requireAuth, getMe);
