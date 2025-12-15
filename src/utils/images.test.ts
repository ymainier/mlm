import { describe, it, expect, vi, beforeEach } from "vitest";
import { access, writeFile } from "node:fs/promises";
import { save, validateOutputPaths } from "./images";
import type { GeneratedFile } from "ai";

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
  access: vi.fn(),
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

  it("should use specified output paths when provided", async () => {
    const images = [
      createMockFile("image/png", new Uint8Array([1])),
      createMockFile("image/jpeg", new Uint8Array([2])),
    ];

    const paths = await save(images, [
      "/custom/path1.png",
      "/custom/path2.jpg",
    ]);

    expect(paths).toEqual(["/custom/path1.png", "/custom/path2.jpg"]);
    expect(writeFile).toHaveBeenCalledWith(
      "/custom/path1.png",
      new Uint8Array([1]),
    );
    expect(writeFile).toHaveBeenCalledWith(
      "/custom/path2.jpg",
      new Uint8Array([2]),
    );
  });

  it("should use temp dir for extra images when fewer outputs specified", async () => {
    const images = [
      createMockFile("image/png", new Uint8Array([1])),
      createMockFile("image/jpeg", new Uint8Array([2])),
    ];

    const paths = await save(images, ["/custom/path.png"]);

    expect(paths).toHaveLength(2);
    expect(paths[0]).toBe("/custom/path.png");
    expect(paths[1]).toMatch(/^\/tmp\/image-\d+-1\.jpeg$/);
  });

  it("should use temp dir when empty outputs array provided", async () => {
    const images = [createMockFile("image/png", new Uint8Array([1]))];

    const paths = await save(images, []);

    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/^\/tmp\/image-\d+-0\.png$/);
  });
});

describe("validateOutputPaths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass validation when files do not exist and dirs are writable", async () => {
    vi.mocked(access).mockImplementation(async (_path, mode) => {
      if (mode === 0) {
        // F_OK - file existence check
        const err = new Error("ENOENT") as NodeJS.ErrnoException;
        err.code = "ENOENT";
        throw err;
      }
      // W_OK - dir writable check - success
    });

    await expect(
      validateOutputPaths(["/writable/dir/file.png"]),
    ).resolves.toBeUndefined();
  });

  it("should throw when output file already exists", async () => {
    vi.mocked(access).mockResolvedValue(undefined); // File exists

    await expect(validateOutputPaths(["/existing/file.png"])).rejects.toThrow(
      "Output file already exists: /existing/file.png",
    );
  });

  it("should throw when parent directory does not exist", async () => {
    vi.mocked(access).mockImplementation(async (_path, mode) => {
      if (mode === 0) {
        // F_OK - file doesn't exist (good)
        const err = new Error("ENOENT") as NodeJS.ErrnoException;
        err.code = "ENOENT";
        throw err;
      }
      // W_OK - dir not writable
      throw new Error("EACCES");
    });

    await expect(
      validateOutputPaths(["/nonexistent/dir/file.png"]),
    ).rejects.toThrow(
      "Cannot write to directory: /nonexistent/dir (does not exist or not writable)",
    );
  });

  it("should validate all paths and fail on first error", async () => {
    let callCount = 0;
    vi.mocked(access).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First file doesn't exist (good)
        const err = new Error("ENOENT") as NodeJS.ErrnoException;
        err.code = "ENOENT";
        throw err;
      }
      if (callCount === 2) {
        // First dir is writable (good)
        return;
      }
      // Second file exists (bad)
      return;
    });

    await expect(
      validateOutputPaths(["/good/file1.png", "/bad/file2.png"]),
    ).rejects.toThrow("Output file already exists: /bad/file2.png");
  });

  it("should pass with empty array", async () => {
    await expect(validateOutputPaths([])).resolves.toBeUndefined();
    expect(access).not.toHaveBeenCalled();
  });
});
