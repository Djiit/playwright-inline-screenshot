import { expect, test } from "@playwright/test";

test("renders the buildkite homepage", async ({ page }) => {
  await page.goto("https://buildkite.com");
  await expect(page).toHaveTitle(/deliberately wrong/i);
});
