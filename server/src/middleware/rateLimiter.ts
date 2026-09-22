import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});
