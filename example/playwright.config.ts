import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  outputDir: "test-results",
  reporter: [["../dist/index.js"], ["line"]],
  use: {
    screenshot: "only-on-failure",
  },
});
