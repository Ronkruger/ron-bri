import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-big-calendar") || id.includes("date-fns")) {
            return "calendar-vendor";
          }

          if (id.includes("@emoji-mart") || id.includes("emoji-mart")) {
            return "emoji-vendor";
          }

          if (id.includes("lottie-react") || id.includes("lottie-web")) {
            return "lottie-vendor";
          }

          if (id.includes("@tanstack/react-query")) {
            return "query-vendor";
          }

          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
            return "react-vendor";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ronbri/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@ronbri/api-client": path.resolve(__dirname, "../../packages/api-client/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
