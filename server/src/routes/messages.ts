import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { messageService } from "../services";

const router = Router();
router.use(requireAuth);

// GET /api/messages?cursor=...&limit=...
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const result = await messageService.list(cursor, limit);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
