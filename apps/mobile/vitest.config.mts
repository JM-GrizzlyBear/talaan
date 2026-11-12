import { defineConfig } from "vitest/config";

// Only the plain TypeScript parts (no React Native) are tested here
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
