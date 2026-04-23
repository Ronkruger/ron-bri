import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { inviteService } from "../services";
import { getIo } from "../services";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  type: z.enum(["OUTSIDE", "FOOD", "BONDING", "CUSTOM"]),
  title: z.string().min(1),
  message: z.string().min(1),
  emojis: z.array(z.string()).default([]),
  gifUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
});

const respondSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
});

// POST /api/invites
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad Request", message: parsed.error.flatten() });
      return;
    }
    const invite = await inviteService.create(req.userId!, parsed.data);
    // Real-time push to receiver
    const io = getIo();
    if (io) {
      io.to(`user:${invite.receiverId}`).emit("invite:new", { invite });
    }
    res.status(201).json(invite);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/invites/inbox
router.get("/inbox", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invites = await inviteService.inbox(req.userId!);
    res.json(invites);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/invites/sent
router.get("/sent", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invites = await inviteService.sent(req.userId!);
    res.json(invites);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/invites/:id/respond
router.patch("/:id/respond", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad Request" });
      return;
    }
    const invite = await inviteService.findById(req.params.id);
    if (!invite) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (invite.receiverId !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const updated = await inviteService.respond(req.params.id, parsed.data.status);
    // Notify sender
    const io = getIo();
    if (io) {
      io.to(`user:${invite.senderId}`).emit("invite:responded", {
        inviteId: invite.id,
        status: parsed.data.status,
      });
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/invites/:id/seen
router.patch("/:id/seen", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invite = await inviteService.findById(req.params.id);
    if (!invite) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (invite.receiverId !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const updated = await inviteService.markSeen(req.params.id);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
