import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In development the API runs on port 4000; the browser only talks to Vite
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
