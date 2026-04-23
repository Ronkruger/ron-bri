import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const issueAccessToken = (userId: string, role: string) => {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ userId, role }, secret, { expiresIn: "15m" });
};

const issueRefreshToken = (userId: string) => {
  const secret = process.env.JWT_REFRESH_SECRET!;
  return jwt.sign({ userId }, secret, { expiresIn: "30d" });
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad Request", message: "username and password required" });
      return;
    }
    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    const accessToken = issueAccessToken(user.id, user.role);
    const refreshToken = issueRefreshToken(user.id);

    res.cookie("refreshToken", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, accessToken });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  try {
    // Accept token from httpOnly cookie (web) or x-refresh-token header (mobile)
    const token =
      (req.cookies?.refreshToken as string | undefined) ??
      (req.headers["x-refresh-token"] as string | undefined);
    if (!token) {
      res.status(401).json({ error: "Unauthorized", message: "No refresh token" });
      return;
    }

    const secret = process.env.JWT_REFRESH_SECRET!;
    const payload = jwt.verify(token, secret) as { userId: string };

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "User not found" });
      return;
    }

    const newAccessToken = issueAccessToken(user.id, user.role);
    const newRefreshToken = issueRefreshToken(user.id);

    res.cookie("refreshToken", newRefreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid refresh token" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", { ...COOKIE_OPTIONS });
  res.json({ message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
