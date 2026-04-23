import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { rateLimit } from "express-rate-limit";

const router = Router();
router.use(requireAuth);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyGenerator: (req: AuthRequest) => req.userId ?? req.ip ?? "unknown",
  message: { error: "Too Many Requests", message: "Slow down, you're using the AI too fast!" },
});

router.use(aiLimiter);

// POST /api/ai/chat  → SSE streaming response
router.post("/chat", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messages } = req.body as {
      messages: Array<{ role: string; content: string }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Bad Request", message: "messages array required" });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "AI service not configured" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.CLIENT_URL ?? "http://localhost:5173",
        "X-Title": "RonBri Couples App",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      res.write("event: error\ndata: AI service unavailable\n\n");
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Forward raw SSE chunks from OpenRouter
        res.write(chunk);
      }
      res.end();
    };

    req.on("close", () => {
      reader.cancel();
    });

    await pump();
  } catch (err) {
    console.error("AI chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.end();
    }
  }
});

export default router;
