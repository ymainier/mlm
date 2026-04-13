import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveFragments } from "./fragments.ts";
import { readFile } from "node:fs/promises";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("resolveFragments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return undefined for empty sources", async () => {
    const result = await resolveFragments([], undefined);
    expect(result).toBeUndefined();
  });

  it("should read a local file", async () => {
    vi.mocked(readFile).mockResolvedValueOnce("file content");

    const result = await resolveFragments(["./doc.md"], undefined);
    expect(readFile).toHaveBeenCalledWith("./doc.md", "utf-8");
    expect(result).toBe("file content");
  });

  it("should fetch a URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "url content",
    });

    const result = await resolveFragments(
      ["https://example.com/doc.txt"],
      undefined,
    );
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/doc.txt");
    expect(result).toBe("url content");
  });

  it("should throw on failed URL fetch", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(
      resolveFragments(["https://example.com/missing.txt"], undefined),
    ).rejects.toThrow("404");
  });

  it("should return stdinContent for - source", async () => {
    const result = await resolveFragments(["-"], "stdin data");
    expect(result).toBe("stdin data");
  });

  it("should join multiple fragments with double newline", async () => {
    vi.mocked(readFile).mockResolvedValueOnce("first");
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "second" });

    const result = await resolveFragments(
      ["./a.md", "https://example.com/b.txt"],
      undefined,
    );
    expect(result).toBe("first\n\nsecond");
  });
});
