import { describe, it, expect, vi, beforeEach } from "vitest";
import { readStdin, getPrompt } from "./input";

describe("readStdin", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  let listeners: Record<string, Function>;

  beforeEach(() => {
    listeners = {};

    vi.spyOn(process.stdin, "setEncoding").mockImplementation(
      () => process.stdin,
    );
    vi.spyOn(process.stdin, "on").mockImplementation((event, handler) => {
      listeners[event] = handler;
      return process.stdin;
    });
  });

  it("should read and trim data from stdin", async () => {
    const promise = readStdin();

    listeners["data"]?.(" hello world  \n");
    listeners["end"]?.();

    const result = await promise;
    expect(result).toBe("hello world");
  });

  it("should handle multiple chunks", async () => {
    const promise = readStdin();

    listeners["data"]?.("chunk1");
    listeners["data"]?.("chunk2");
    listeners["data"]?.("chunk3");
    listeners["end"]?.();

    const result = await promise;
    expect(result).toBe("chunk1chunk2chunk3");
  });

  it("should reject on error", async () => {
    const promise = readStdin();

    const error = new Error("Stream error");
    listeners["error"]?.(error);

    await expect(promise).rejects.toThrow("Stream error");
  });
});

describe("getPrompt", () => {
  it("should return the input as-is when not -", async () => {
    expect(await getPrompt("hello")).toBe("hello");
  });

  it("should return pre-read stdinContent when input is -", async () => {
    expect(await getPrompt("-", "piped content")).toBe("piped content");
  });

  it("should return empty string when input is - and stdinContent is empty string", async () => {
    expect(await getPrompt("-", "")).toBe("");
  });
});
