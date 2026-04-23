import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { relationshipService } from "../services";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

// GET /api/relationship
router.get("/", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rel = await relationshipService.get();
    if (!rel) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(rel);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const updateSchema = z.object({
  startDate: z.string(),
});

// PATCH /api/relationship
router.patch("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad Request" });
      return;
    }
    const rel = await relationshipService.update(parsed.data.startDate);
    res.json(rel);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
