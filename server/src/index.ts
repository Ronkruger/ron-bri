import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";

import authRouter from "./routes/auth";
import calendarRouter from "./routes/calendar";
import invitesRouter from "./routes/invites";
import messagesRouter from "./routes/messages";
import uploadRouter from "./routes/upload";
import aiRouter from "./routes/ai";
import giphyRouter from "./routes/giphy";
import relationshipRouter from "./routes/relationship";

import { initSocket } from "./socket";
import { setIo } from "./services";

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = initSocket(httpServer);
setIo(io);

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile, curl, etc.)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".railway.app")
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global rate limit (generous — only 2 users)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/invites", invitesRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/ai", aiRouter);
app.use("/api/giphy", giphyRouter);
app.use("/api/relationship", relationshipRouter);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}`);
});
