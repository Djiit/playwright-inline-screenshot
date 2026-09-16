import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  artifactEscapeCodeForImage,
  defaultMode,
  escapeCodeForImage,
  itermEscapeCodeForImage,
} from "../src/escape-codes";

const tmp = mkdtempSync(join(tmpdir(), "pw-inline-screenshot-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const png = join(tmp, "screenshot-1.png");
writeFileSync(png, Buffer.from("89504e470d0a1a0a", "hex")); // PNG magic bytes

describe("defaultMode", () => {
  it("returns iterm2 locally", () => {
    expect(defaultMode({})).toBe("iterm2");
  });

  it("returns artifact on CI", () => {
    expect(defaultMode({ CI: "true" })).toBe("artifact");
  });

  it("is forced by PLAYWRIGHT_INLINE_SCREENSHOT, overriding CI", () => {
    expect(defaultMode({ CI: "true", PLAYWRIGHT_INLINE_SCREENSHOT: "iterm2" })).toBe("iterm2");
    expect(defaultMode({ PLAYWRIGHT_INLINE_SCREENSHOT: "artifact" })).toBe("artifact");
    expect(defaultMode({ PLAYWRIGHT_INLINE_SCREENSHOT: "off" })).toBe("off");
  });

  it("ignores unrecognized values", () => {
    expect(defaultMode({ PLAYWRIGHT_INLINE_SCREENSHOT: "nonsense" })).toBe("iterm2");
  });
});

describe("artifactEscapeCodeForImage", () => {
  it("emits OSC 1338 with a path relative to the base dir", () => {
    const nested = join(tmp, "test-results", "a-test", "test-failed-1.png");
    const code = artifactEscapeCodeForImage(nested, tmp);
    expect(code).toBe(`\x1b]1338;url=artifact://test-results/a-test/test-failed-1.png\x07`);
  });

  it("uses cwd by default", () => {
    const code = artifactEscapeCodeForImage(join(process.cwd(), "tmp", "shot.png"));
    expect(code).toBe(`\x1b]1338;url=artifact://tmp/shot.png\x07`);
  });
});

describe("itermEscapeCodeForImage", () => {
  it("emits OSC 1337 with base64 name and image", () => {
    const code = itermEscapeCodeForImage(png);
    const image = Buffer.from("89504e470d0a1a0a", "hex").toString("base64");
    expect(code).toBe(
      `\x1b]1337;File=name=${Buffer.from("screenshot-1.png").toString("base64")};inline=1:${image}\x07`
    );
  });
});

describe("escapeCodeForImage", () => {
  it("dispatches by mode", () => {
    expect(escapeCodeForImage(png, "off", tmp)).toBeNull();
    expect(escapeCodeForImage(png, "artifact", tmp)).toBe(artifactEscapeCodeForImage(png, tmp));
    expect(escapeCodeForImage(png, "iterm2")).toBe(itermEscapeCodeForImage(png));
  });
});
