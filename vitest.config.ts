import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The example/ project is a manual Playwright demo, not part of the suite.
    exclude: ["example/**", "node_modules/**", "dist/**"],
  },
});
