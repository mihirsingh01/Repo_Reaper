import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["founder", "admin"]).optional().default("founder"),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email required").toLowerCase().trim(),
  password: z.string().min(1, "Password required"),
});

export async function register(req: Request, res: Response) {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "Email is already registered" });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
  });

  const token = jwt.sign({ userId: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  return res.status(201).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  // Retrieve user with explicit inclusion of passwordHash
  const user = await User.findOne({ email }).select("+passwordHash");

  // Prevent user enumeration: identical response for missing user or bad password
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ userId: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  return res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      dailyAnalysisCount: user.dailyAnalysisCount,
    },
    token,
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  const user = req.user!;
  return res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      dailyAnalysisCount: user.dailyAnalysisCount,
    },
  });
}
