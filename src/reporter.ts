import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import {
  defaultMode,
  escapeCodeForImage,
  type InlineScreenshotMode,
} from "./escape-codes";

export interface InlineScreenshotReporterOptions {
  /**
   * Force the output mode instead of auto-detection
   * (default: `PLAYWRIGHT_INLINE_SCREENSHOT` env var, else `CI` ? "artifact" : "iterm2").
   */
  mode?: InlineScreenshotMode;
  /**
   * Directory artifact paths are made relative to (default: `process.cwd()`).
   * Must match the working directory `buildkite-agent artifact upload` runs from.
   */
  artifactBaseDir?: string;
  /** Also print a plain-text line naming the screenshot file (default: true). */
  printFilePath?: boolean;
  /** Output stream, overridable for tests (default: `process.stdout`). */
  stream?: { write(chunk: string): boolean };
}

const FAILURE_STATUSES = new Set<TestResult["status"]>(["failed", "timedOut"]);

/**
 * Playwright reporter that inlines image attachments (screenshots) of failed
 * tests into the terminal output, using the same ANSI escape formats as
 * capybara-inline-screenshot: `artifact://` (OSC 1338) on CI so images render
 * inline in Buildkite, iTerm2 base64 (OSC 1337) locally.
 *
 * Screenshots are provided by Playwright's built-in capture; enable it with:
 *
 *   use: { screenshot: "only-on-failure" }
 */
export class InlineScreenshotReporter implements Reporter {
  printsToStdio(): boolean {
    return true;
  }

  private readonly mode: InlineScreenshotMode;
  private readonly artifactBaseDir: string;
  private readonly printFilePath: boolean;
  private readonly stream: { write(chunk: string): boolean };

  constructor(options: InlineScreenshotReporterOptions = {}) {
    this.mode = options.mode ?? defaultMode();
    this.artifactBaseDir = options.artifactBaseDir ?? process.cwd();
    this.printFilePath = options.printFilePath ?? true;
    this.stream = options.stream ?? process.stdout;
  }

  onTestEnd(_test: TestCase, result: TestResult): void {
    if (!FAILURE_STATUSES.has(result.status)) return;
    for (const attachment of result.attachments) {
      if (!attachment.path || !attachment.contentType.startsWith("image/")) continue;
      this.inlineImage(attachment.path);
    }
  }

  private inlineImage(filePath: string): void {
    try {
      const code = escapeCodeForImage(filePath, this.mode, this.artifactBaseDir);
      if (!code) return;
      if (this.printFilePath) this.stream.write(`Screenshot: ${filePath}\n`);
      this.stream.write(`${code}\n`);
    } catch (error) {
      // Never break the test run over decoration.
      this.stream.write(
        `playwright-inline-screenshot: could not inline ${filePath}: ${String(error)}\n`
      );
    }
  }
}
