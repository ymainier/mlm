import { describe, it, expect, vi, beforeEach } from "vitest";
import { experimental_generateImage as generateImage } from "ai";
import { imageNew } from "./image-new.ts";
import { getPrompt } from "../utils/input.ts";
import { save, validateOutputPaths } from "../utils/images.ts";
import { exit } from "node:process";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn() }));

vi.mock("ai", () => ({ experimental_generateImage: vi.fn() }));

vi.mock("../utils/images", () => ({
  save: vi.fn(),
  validateOutputPaths: vi.fn(),
}));

vi.mock("node:process", () => ({
  exit: vi.fn(),
}));

function createMockImageResult(
  images: Array<{ base64: string; mediaType: string }>,
): Awaited<ReturnType<typeof generateImage>> {
  return { images } as unknown as Awaited<ReturnType<typeof generateImage>>;
}

describe("image-new command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getPrompt).mockImplementation(async (input) => input);
    vi.mocked(save).mockResolvedValue(["/tmp/image-123-0.png"]);
  });

  it("should create a command named 'image-new'", () => {
    const cmd = imageNew();
    expect(cmd.name()).toBe("image-new");
  });

  it("should call generateImage with prompt and model", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: "aGVsbG8=", mediaType: "image/png" }]),
    );

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "a beautiful sunset"]);

    expect(generateImage).toHaveBeenCalledWith({
      model: "google/imagen-4.0-fast-generate-001",
      prompt: "a beautiful sunset",
      providerOptions: {},
    });
  });

  it("should use custom model when specified", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: "aGVsbG8=", mediaType: "image/png" }]),
    );

    const cmd = imageNew();
    await cmd.parseAsync([
      "node",
      "test",
      "-m",
      "stability/stable-diffusion-3",
      "a dog",
    ]);

    expect(generateImage).toHaveBeenCalledWith({
      model: "stability/stable-diffusion-3",
      prompt: "a dog",
      providerOptions: {},
    });
  });

  it("should call save with generated images", async () => {
    const base64Data = Buffer.from("fake image data").toString("base64");
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: base64Data, mediaType: "image/png" }]),
    );

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "a cat"]);

    expect(save).toHaveBeenCalledWith(
      [expect.objectContaining({ mediaType: "image/png" })],
      [],
    );
  });

  it("should call save with multiple generated images", async () => {
    vi.mocked(save).mockResolvedValue([
      "/tmp/image-123-0.png",
      "/tmp/image-123-1.jpeg",
    ]);
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([
        { base64: "YQ==", mediaType: "image/png" },
        { base64: "Yg==", mediaType: "image/jpeg" },
      ]),
    );

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "two images"]);

    expect(save).toHaveBeenCalledWith(
      [
        expect.objectContaining({ mediaType: "image/png" }),
        expect.objectContaining({ mediaType: "image/jpeg" }),
      ],
      [],
    );
  });

  it("should exit with code 1 when generateImage throws an error", async () => {
    vi.mocked(generateImage).mockRejectedValue(new Error("API error"));

    const cmd = imageNew();
    // The command will throw after exit(1) is called because mocked exit doesn't stop execution
    await cmd.parseAsync(["node", "test", "error case"]).catch(() => {});

    expect(console.error).toHaveBeenCalledWith(
      "Error generating image:",
      expect.any(Error),
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("should exit with code 1 when no images are generated", async () => {
    vi.mocked(generateImage).mockResolvedValue(createMockImageResult([]));

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "empty result"]);

    expect(console.error).toHaveBeenCalledWith("No images were generated.");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("should parse single -o option into providerOptions", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: "YQ==", mediaType: "image/png" }]),
    );

    const cmd = imageNew();
    await cmd.parseAsync([
      "node",
      "test",
      "-o",
      "google.aspectRatio=16:9",
      "test",
    ]);

    expect(generateImage).toHaveBeenCalledWith({
      model: "google/imagen-4.0-fast-generate-001",
      prompt: "test",
      providerOptions: { google: { aspectRatio: "16:9" } },
    });
  });

  it("should parse multiple -o options into providerOptions", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: "YQ==", mediaType: "image/png" }]),
    );

    const cmd = imageNew();
    await cmd.parseAsync([
      "node",
      "test",
      "-o",
      "google.aspectRatio=16:9",
      "-o",
      "google.numberOfImages=4",
      "test",
    ]);

    expect(generateImage).toHaveBeenCalledWith({
      model: "google/imagen-4.0-fast-generate-001",
      prompt: "test",
      providerOptions: { google: { aspectRatio: "16:9", numberOfImages: 4 } },
    });
  });

  it("should pass -O output paths to save", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: "YQ==", mediaType: "image/png" }]),
    );

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "-O", "/custom/output.png", "a cat"]);

    expect(save).toHaveBeenCalledWith(expect.any(Array), [
      "/custom/output.png",
    ]);
  });

  it("should pass multiple -O output paths to save", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([
        { base64: "YQ==", mediaType: "image/png" },
        { base64: "Yg==", mediaType: "image/jpeg" },
      ]),
    );

    const cmd = imageNew();
    await cmd.parseAsync([
      "node",
      "test",
      "-O",
      "/path/one.png",
      "-O",
      "/path/two.jpg",
      "two cats",
    ]);

    expect(save).toHaveBeenCalledWith(expect.any(Array), [
      "/path/one.png",
      "/path/two.jpg",
    ]);
  });

  it("should validate output paths before calling generateImage", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: "YQ==", mediaType: "image/png" }]),
    );

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "-O", "/custom/output.png", "test"]);

    expect(validateOutputPaths).toHaveBeenCalledWith(["/custom/output.png"]);
    expect(validateOutputPaths).toHaveBeenCalledBefore(
      vi.mocked(generateImage),
    );
  });

  it("should exit with code 1 when output validation fails", async () => {
    vi.mocked(validateOutputPaths).mockRejectedValue(
      new Error("Output file already exists: /existing/file.png"),
    );
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: "YQ==", mediaType: "image/png" }]),
    );

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "-O", "/existing/file.png", "test"]);

    expect(console.error).toHaveBeenCalledWith(
      "Output file already exists: /existing/file.png",
    );
    expect(exit).toHaveBeenCalledWith(1);
  });
});
