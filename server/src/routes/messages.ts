import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { messageService } from "../services";
import { getIo } from "../services";
import { pushService } from "../services/push.service";
import { z } from "zod";

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

const createSchema = z.object({
  content: z.string().trim().min(1).max(4000).optional(),
  imageUrl: z.string().url().optional(),
  gifUrl: z.string().url().optional(),
}).refine((data) => Boolean(data.content || data.imageUrl || data.gifUrl), {
  message: "A message must contain text or media.",
});

// POST /api/messages — also powers notification inline replies.
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "A valid message is required." });
    return;
  }

  try {
    const senderId = req.userId!;
    const receiverId = senderId === "user_boy" ? "user_girl" : "user_boy";
    const message = await messageService.create(senderId, parsed.data);
    getIo()?.to(`user:${receiverId}`).emit("message:new", { message });
    getIo()?.to(`user:${senderId}`).emit("message:new", { message });
    void pushService.sendMessage(receiverId, message);
    res.status(201).json(message);
  } catch (error) {
    console.error("POST /api/messages failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
