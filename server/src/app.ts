import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import axios from "axios";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { metrics } from "./utils/metrics.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

// 1. Request ID Generation & Context Propagation Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers["x-request-id"];
  const requestId = typeof incomingId === "string" && incomingId.trim().length > 0
    ? incomingId.trim()
    : crypto.randomUUID();

  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

// 2. Metrics & Latency Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    metrics.recordRequest(res.statusCode, duration);
  });
  next();
});

// 3. Security Hardening: Helmet with Content Security Policy & Strict Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://avatars.githubusercontent.com", "https://github.com"],
        connectSrc: ["'self'", env.CORS_ORIGIN, env.AI_SERVICE_URL],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// 4. Strict CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server) or matching CORS_ORIGIN
      if (!origin || origin === env.CORS_ORIGIN || origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not permitted by CORS policy`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-API-Key"],
    exposedHeaders: ["X-Request-Id"],
  })
);

// 5. Body Size Limits (Hardening against payload flooding)
app.use(express.json({ limit: `${env.MAX_BODY_SIZE_KB}kb` }));
app.use(express.urlencoded({ extended: true, limit: `${env.MAX_BODY_SIZE_KB}kb` }));

if (env.NODE_ENV !== "test") {
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as any).id,
      customProps: (req) => ({ requestId: (req as any).id }),
    })
  );
}

// 6. Observability: Liveness Probe (/api/health)
app.get("/api/health", async (_req: Request, res: Response) => {
  let mongoStatus = "disconnected";
  try {
    mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  } catch {
    mongoStatus = "error";
  }

  let aiServiceStatus = "unknown";
  try {
    const aiResponse = await axios.get(`${env.AI_SERVICE_URL}/health`, {
      timeout: 3000,
      headers: { "X-Request-Id": (_req as any).id || "health-check" },
    });
    aiServiceStatus = aiResponse.data?.status === "ok" ? "ok" : "degraded";
  } catch {
    aiServiceStatus = "unreachable";
  }

  return res.json({
    status: "ok",
    services: {
      server: "ok",
      mongo: mongoStatus,
      aiService: aiServiceStatus,
    },
    killSwitchActive: metrics.isKillSwitchActive(),
    timestamp: new Date().toISOString(),
  });
});

// 7. Observability: Readiness Probe (/api/ready)
app.get("/api/ready", async (_req: Request, res: Response) => {
  const isMongoReady = mongoose.connection.readyState === 1;

  let isAiReady = false;
  try {
    const aiResponse = await axios.get(`${env.AI_SERVICE_URL}/ready`, {
      timeout: 3000,
      headers: { "X-Request-Id": (_req as any).id || "ready-check" },
    });
    isAiReady = aiResponse.status === 200;
  } catch {
    isAiReady = false;
  }

  if (isMongoReady && isAiReady) {
    return res.status(200).json({
      status: "ready",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    status: "not_ready",
    details: {
      mongodb: isMongoReady ? "ready" : "not_connected",
      aiService: isAiReady ? "ready" : "not_ready",
    },
    message: "Services are warming up or recovering from a cold start",
    timestamp: new Date().toISOString(),
  });
});

// 8. Observability: System Metrics (/api/metrics)
app.get("/api/metrics", (_req: Request, res: Response) => {
  return res.json(metrics.getMetrics());
});

// 9. Mount Core REST API router
app.use("/api", apiRouter);

// Central 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Central error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err, "Unhandled application error");
  res.status(500).json({
    error: "Internal server error",
    message: env.NODE_ENV === "production" ? undefined : err.message,
    requestId: (_req as any).id,
  });
});
