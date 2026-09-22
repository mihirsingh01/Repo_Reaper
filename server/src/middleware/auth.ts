import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User, IUser, UserRole } from "../models/User.js";

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  userId: string;
  role: UserRole;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.substring(7).trim();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}
