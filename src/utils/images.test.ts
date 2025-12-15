import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFile } from "node:fs/promises";
import { save } from "./images";
import type { GeneratedFile } from "ai";

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
}));

vi.mock("node:os", () => ({
  tmpdir: vi.fn(() => "/tmp"),
}));

function createMockFile(mediaType: string, data: Uint8Array): GeneratedFile {
  return { mediaType, uint8Array: data } as GeneratedFile;
}

describe("save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writeFile).mockResolvedValue(undefined);
  });

  it("should save a single image to temp directory", async () => {
    const mockData = new Uint8Array([1, 2, 3, 4]);
    const images = [createMockFile("image/png", mockData)];

    const paths = await save(images);

    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/^\/tmp\/image-\d+-0\.png$/);
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/tmp\/image-\d+-0\.png$/),
      mockData,
    );
  });

  it("should save multiple images with correct indices", async () => {
    const images = [
      createMockFile("image/png", new Uint8Array([1])),
      createMockFile("image/jpeg", new Uint8Array([2])),
    ];

    const paths = await save(images);

    expect(paths).toHaveLength(2);
    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(paths[0]).toMatch(/^\/tmp\/image-\d+-0\.png$/);
    expect(paths[1]).toMatch(/^\/tmp\/image-\d+-1\.jpeg$/);
  });

  it("should use correct extension based on mediaType", async () => {
    const testCases = [
      { mediaType: "image/png", extension: "png" },
      { mediaType: "image/jpeg", extension: "jpeg" },
      { mediaType: "image/gif", extension: "gif" },
      { mediaType: "image/webp", extension: "webp" },
    ];

    for (const { mediaType, extension } of testCases) {
      vi.clearAllMocks();
      const images = [createMockFile(mediaType, new Uint8Array([1]))];

      const paths = await save(images);

      expect(paths[0]).toMatch(new RegExp(`\\.${extension}$`));
    }
  });

  it("should default to png extension when mediaType is undefined", async () => {
    const images = [{ uint8Array: new Uint8Array([1]) } as GeneratedFile];

    const paths = await save(images);

    expect(paths[0]).toMatch(/\.png$/);
  });

  it("should return empty array for empty input", async () => {
    const paths = await save([]);

    expect(paths).toHaveLength(0);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("should use consistent timestamp for all images in a batch", async () => {
    const images = [
      createMockFile("image/png", new Uint8Array([1])),
      createMockFile("image/png", new Uint8Array([2])),
      createMockFile("image/png", new Uint8Array([3])),
    ];

    const paths = await save(images);

    const timestamps = paths.map((p) => {
      const match = p.match(/image-(\d+)-/);
      return match?.[1];
    });

    expect(timestamps[0]).toBe(timestamps[1]);
    expect(timestamps[1]).toBe(timestamps[2]);
  });
});
