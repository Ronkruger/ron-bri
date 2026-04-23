import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

// GET /api/giphy/search?q=...&limit=...
router.get("/search", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "Giphy not configured" });
      return;
    }
    const q = encodeURIComponent((req.query.q as string) ?? "");
    const limit = Math.min(Number(req.query.limit) || 20, 25);
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${q}&limit=${limit}&rating=g`
    );
    const data = await response.json() as unknown;
    res.json(data);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/giphy/trending?limit=...
router.get("/trending", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "Giphy not configured" });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 20, 25);
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=g`
    );
    const data = await response.json() as unknown;
    res.json(data);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
