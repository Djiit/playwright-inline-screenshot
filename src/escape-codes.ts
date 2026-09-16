import { readFileSync } from "node:fs";
import { basename, relative, sep } from "node:path";

export type InlineScreenshotMode = "artifact" | "iterm2" | "off";

function toPosix(p: string): string {
  return sep === "/" ? p : p.split(sep).join("/");
}

function encodeBase64(data: string | Buffer): string {
  return Buffer.from(data).toString("base64");
}

/**
 * Picks the output mode the same way capybara-inline-screenshot does:
 * `PLAYWRIGHT_INLINE_SCREENSHOT` forces a mode; otherwise `CI` selects the
 * Buildkite `artifact://` format and iTerm2 base64 is used locally.
 */
export function defaultMode(env: NodeJS.ProcessEnv = process.env): InlineScreenshotMode {
  const forced = env["PLAYWRIGHT_INLINE_SCREENSHOT"];
  if (forced === "artifact" || forced === "iterm2" || forced === "off") return forced;
  return env["CI"] ? "artifact" : "iterm2";
}

/**
 * Buildkite inline image (OSC 1338): the image is inlined by the Buildkite
 * terminal renderer from an uploaded artifact, so the URL is the artifact
 * path relative to the directory artifacts are uploaded from.
 * http://buildkite.github.io/terminal/inline-images/
 */
export function artifactEscapeCodeForImage(
  filePath: string,
  baseDir: string = process.cwd()
): string {
  const relativePath = toPosix(relative(baseDir, filePath));
  return `\x1b]1338;url=artifact://${relativePath}\x07`;
}

/**
 * iTerm2 inline image (OSC 1337): base64-encoded image embedded directly in
 * the escape sequence, viewable in iTerm2 and other supporting terminals.
 * http://iterm2.com/images.html
 */
export function itermEscapeCodeForImage(filePath: string): string {
  const name = encodeBase64(basename(filePath));
  const image = encodeBase64(readFileSync(filePath));
  return `\x1b]1337;File=name=${name};inline=1:${image}\x07`;
}

/**
 * Returns the inline image escape sequence for a screenshot file, or null in
 * "off" mode. Throws if the file cannot be read (iterm2 mode); callers that
 * must not fail the run should catch.
 */
export function escapeCodeForImage(
  filePath: string,
  mode: InlineScreenshotMode,
  baseDir: string = process.cwd()
): string | null {
  if (mode === "off") return null;
  return mode === "artifact"
    ? artifactEscapeCodeForImage(filePath, baseDir)
    : itermEscapeCodeForImage(filePath);
}
