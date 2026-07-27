import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During local `npm run dev`, forward /api calls to the Express server on :3000.
// In production, server.js serves the built files and handles /api itself.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
