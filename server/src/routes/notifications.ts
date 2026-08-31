import { Router, Response } from "express";
import { z } from "zod";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { isExpoPushToken, pushService } from "../services/push.service";

const router = Router();
router.use(requireAuth);

const registrationSchema = z.object({
  token: z.string().refine(isExpoPushToken, "Invalid Expo push token"),
  platform: z.enum(["android", "ios"]),
});

router.post("/register", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid push registration." });
    return;
  }

  try {
    await pushService.register(req.userId!, parsed.data.token, parsed.data.platform);
    res.status(204).send();
  } catch (error) {
    console.error("Push registration failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/register", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "A push token is required." });
    return;
  }

  try {
    await pushService.unregister(req.userId!, parsed.data.token);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
