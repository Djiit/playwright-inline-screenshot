import { defaultMode, escapeCodeForImage, type InlineScreenshotMode } from "./escape-codes";

/**
 * Print an inline image escape sequence for an arbitrary image file — useful
 * outside test failures, e.g. from globalSetup or scripts. Uses the same
 * auto mode detection as the reporter.
 */
export function printInlineImage(
  filePath: string,
  mode: InlineScreenshotMode = defaultMode(),
  baseDir: string = process.cwd()
): void {
  const code = escapeCodeForImage(filePath, mode, baseDir);
  if (code) process.stdout.write(`${code}\n`);
}
