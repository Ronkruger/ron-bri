import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { bucketListService } from "../services";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/bucket-list
router.get("/", async (_req, res) => {
  try {
    const items = await bucketListService.findAll();
    res.json(items);
  } catch {
    res.status(500).json({ message: "Failed to load bucket list" });
  }
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  emoji: z.string().max(8).optional(),
  category: z.enum(["Travel", "Food", "Adventure", "Home", "Other"]).optional(),
  imageUrl: z.string().url().optional(),
});

// POST /api/bucket-list
router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }
  try {
    const userId = (req as any).user.id as string;
    const item = await bucketListService.create(userId, parsed.data);
    res.status(201).json(item);
  } catch {
    res.status(500).json({ message: "Failed to create bucket item" });
  }
});

const completeSchema = z.object({
  completedImageUrl: z.string().url().optional(),
});

// PATCH /api/bucket-list/:id/complete
router.patch("/:id/complete", async (req, res) => {
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  try {
    const item = await bucketListService.complete(req.params.id, parsed.data.completedImageUrl);
    res.json(item);
  } catch {
    res.status(500).json({ message: "Failed to complete bucket item" });
  }
});

// PATCH /api/bucket-list/:id/uncomplete
router.patch("/:id/uncomplete", async (req, res) => {
  try {
    const item = await bucketListService.uncomplete(req.params.id);
    res.json(item);
  } catch {
    res.status(500).json({ message: "Failed to uncomplete bucket item" });
  }
});

// DELETE /api/bucket-list/:id
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.id as string;
    const item = await bucketListService.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: "Bucket item not found" });
      return;
    }
    if (item.createdById !== userId) {
      res.status(403).json({ message: "Only the creator can delete this item" });
      return;
    }
    await bucketListService.delete(req.params.id);
    res.status(204).end();
  } catch {
    res.status(500).json({ message: "Failed to delete bucket item" });
  }
});

export default router;
