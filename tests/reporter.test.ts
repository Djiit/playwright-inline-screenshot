import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TestCase, TestResult } from "@playwright/test/reporter";
import { InlineScreenshotReporter } from "../src/reporter";

const tmp = mkdtempSync(join(tmpdir(), "pw-inline-reporter-"));
beforeEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function fakeTest(): TestCase {
  return { title: "fake test" } as unknown as TestCase;
}

function result(
  status: TestResult["status"],
  attachments: Array<Partial<TestResult["attachments"][number]>>
): TestResult {
  return { status, attachments } as unknown as TestResult;
}

function makeReporter(statuses: TestResult["status"] = "failed") {
  const output: string[] = [];
  const reporter = new InlineScreenshotReporter({
    mode: "iterm2",
    stream: { write: (chunk: string) => { output.push(chunk); return true; } },
  });
  return { reporter, output, status: statuses };
}

describe("InlineScreenshotReporter", () => {
  it("inlines image attachments of failed tests", () => {
    const shot = join(tmp, "test-failed-1.png");
    writeFileSync(shot, Buffer.from("89504e470d0a1a0a", "hex"));

    const { reporter, output } = makeReporter();
    reporter.onTestEnd(
      fakeTest(),
      result("failed", [{ name: "screenshot", contentType: "image/png", path: shot }])
    );

    expect(output[0]).toContain(shot);
    expect(output[1]).toMatch(/^\x1b\]1337;File=/);
  });

  it("ignores passed and skipped tests", () => {
    const shot = join(tmp, "test-failed-1.png");
    writeFileSync(shot, Buffer.from("89504e470d0a1a0a", "hex"));

    const { reporter, output } = makeReporter();
    reporter.onTestEnd(
      fakeTest(),
      result("passed", [{ name: "screenshot", contentType: "image/png", path: shot }])
    );
    reporter.onTestEnd(
      fakeTest(),
      result("skipped", [{ name: "screenshot", contentType: "image/png", path: shot }])
    );

    expect(output).toEqual([]);
  });

  it("handles timedOut as a failure", () => {
    const shot = join(tmp, "test-timedout-1.png");
    writeFileSync(shot, Buffer.from("89504e470d0a1a0a", "hex"));

    const { reporter, output } = makeReporter();
    reporter.onTestEnd(
      fakeTest(),
      result("timedOut", [{ name: "screenshot", contentType: "image/png", path: shot }])
    );

    expect(output).toHaveLength(2);
  });

  it("inlines multiple images from one failure", () => {
    for (const name of ["shot-1.png", "shot-2.png"]) {
      writeFileSync(join(tmp, name), Buffer.from("89504e470d0a1a0a", "hex"));
    }

    const { reporter, output } = makeReporter();
    reporter.onTestEnd(
      fakeTest(),
      result("failed", [
        { name: "shot-1", contentType: "image/png", path: join(tmp, "shot-1.png") },
        { name: "shot-2", contentType: "image/png", path: join(tmp, "shot-2.png") },
      ])
    );

    expect(output.filter((line) => line.startsWith("\x1b]")).length).toBe(2);
  });

  it("ignores non-image attachments like traces and videos", () => {
    const trace = join(tmp, "trace.zip");
    writeFileSync(trace, Buffer.from("[]"));

    const { reporter, output } = makeReporter();
    reporter.onTestEnd(
      fakeTest(),
      result("failed", [
        { name: "trace", contentType: "application/zip", path: trace },
        { name: "video", contentType: "video/webm", path: join(tmp, "video.webm") },
        { name: "embedded", contentType: "image/png", body: Buffer.from("x") },
      ])
    );

    expect(output).toEqual([]);
  });

  it("writes a warning instead of throwing when the file is unreadable", () => {
    const { reporter, output } = makeReporter();
    reporter.onTestEnd(
      fakeTest(),
      result("failed", [
        { name: "screenshot", contentType: "image/png", path: join(tmp, "missing.png") },
      ])
    );

    expect(output).toHaveLength(1);
    expect(output[0]).toContain("playwright-inline-screenshot: could not inline");
  });

  it("emits artifact:// escape codes in artifact mode", () => {
    const shot = join(tmp, "test-failed-1.png");
    writeFileSync(shot, Buffer.from("89504e470d0a1a0a", "hex"));

    const output: string[] = [];
    const reporter = new InlineScreenshotReporter({
      mode: "artifact",
      artifactBaseDir: tmp,
      stream: { write: (chunk: string) => { output.push(chunk); return true; } },
    });
    reporter.onTestEnd(
      fakeTest(),
      result("failed", [
        { name: "screenshot", contentType: "image/png", path: join(tmp, "sub", "test-failed-1.png") },
      ])
    );

    expect(output[1]).toBe("\x1b]1338;url=artifact://sub/test-failed-1.png\x07\n");
  });

  it("writes nothing in off mode", () => {
    const shot = join(tmp, "test-failed-1.png");
    writeFileSync(shot, Buffer.from("89504e470d0a1a0a", "hex"));

    const output: string[] = [];
    const reporter = new InlineScreenshotReporter({
      mode: "off",
      stream: { write: (chunk: string) => { output.push(chunk); return true; } },
    });
    reporter.onTestEnd(
      fakeTest(),
      result("failed", [{ name: "screenshot", contentType: "image/png", path: shot }])
    );

    expect(output).toEqual([]);
  });
});
