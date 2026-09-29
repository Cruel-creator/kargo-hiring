import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Live tests call the real Gemini API. Run with GEMINI_API_KEY set: npm run test:live
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/live/**/*.test.ts"], environment: "node", testTimeout: 180_000 },
});
