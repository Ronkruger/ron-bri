import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { calendarService } from "../services";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string(),
  emoji: z.string().optional(),
  imageUrl: z.string().optional(),
});

// GET /api/calendar
router.get("/", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const events = await calendarService.findAll();
    res.json(events);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/calendar
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad Request", message: parsed.error.flatten() });
      return;
    }
    const event = await calendarService.create(req.userId!, parsed.data);
    res.status(201).json(event);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/calendar/:id
router.patch("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await calendarService.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (existing.createdById !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const event = await calendarService.update(req.params.id, req.body);
    res.json(event);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/calendar/:id
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await calendarService.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (existing.createdById !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await calendarService.delete(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
