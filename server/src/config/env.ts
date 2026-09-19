import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/reporevive"),
  JWT_SECRET: z.string().default("reporevive-dev-jwt-secret-replace-in-production"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  AI_SERVICE_URL: z.string().default("http://localhost:8000"),
  AI_SERVICE_API_KEY: z.string().default("reporevive-internal-ai-service-key-change-me"),
  GITHUB_TOKEN: z.string().optional(),
  DAILY_ANALYSIS_CAP_PER_USER: z.coerce.number().default(15),
  AUTO_ANALYZE_TOP_K: z.coerce.number().default(5),
  CACHE_TTL_HOURS: z.coerce.number().default(24),
  STALE_MONTHS: z.coerce.number().default(12),
  MIN_COMMITS: z.coerce.number().default(30),
  RANK_W_RELEVANCE: z.coerce.number().default(0.40),
  RANK_W_COVERAGE: z.coerce.number().default(0.30),
  RANK_W_VIABILITY: z.coerce.number().default(0.30),
  LLM_SPEND_KILL_SWITCH: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .default("false"),
  MAX_BODY_SIZE_KB: z.coerce.number().default(100),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
