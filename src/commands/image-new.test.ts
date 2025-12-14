import { describe, it, expect, vi, beforeEach } from "vitest";
import { experimental_generateImage as generateImage } from "ai";
import { imageNew } from "./image-new";
import { getPrompt } from "../utils/input";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { exit } from "node:process";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn() }));

vi.mock("ai", () => ({ experimental_generateImage: vi.fn() }));

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
}));

vi.mock("node:os", () => ({
  tmpdir: vi.fn(() => "/tmp"),
}));

vi.mock("node:process", () => ({
  exit: vi.fn(),
}));

function createMockImageResult(
  images: Array<{ base64: string; mediaType: string }>
): Awaited<ReturnType<typeof generateImage>> {
  return { images } as unknown as Awaited<ReturnType<typeof generateImage>>;
}

describe("image-new command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getPrompt).mockImplementation(async (input) => input);
    vi.mocked(writeFile).mockResolvedValue(undefined);
  });

  it("should create a command named 'image-new'", () => {
    const cmd = imageNew();
    expect(cmd.name()).toBe("image-new");
  });

  it("should call generateImage with prompt and model", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: "aGVsbG8=", mediaType: "image/png" }])
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
      createMockImageResult([{ base64: "aGVsbG8=", mediaType: "image/png" }])
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

  it("should write generated images to temp directory", async () => {
    const base64Data = Buffer.from("fake image data").toString("base64");
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: base64Data, mediaType: "image/png" }])
    );

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "a cat"]);

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/tmp\/image-\d+-0\.png$/),
      expect.any(Buffer)
    );
  });

  it("should handle multiple generated images", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([
        { base64: "YQ==", mediaType: "image/png" },
        { base64: "Yg==", mediaType: "image/jpeg" },
      ])
    );

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "two images"]);

    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenCalledWith("Generated 2 image(s).");
  });

  it("should exit with code 1 when generateImage throws an error", async () => {
    vi.mocked(generateImage).mockRejectedValue(new Error("API error"));

    const cmd = imageNew();
    // The command will throw after exit(1) is called because mocked exit doesn't stop execution
    await cmd.parseAsync(["node", "test", "error case"]).catch(() => {});

    expect(console.error).toHaveBeenCalledWith(
      "Error generating image:",
      expect.any(Error)
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

  it("should log the count of generated images", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([
        { base64: "YQ==", mediaType: "image/png" },
        { base64: "Yg==", mediaType: "image/png" },
        { base64: "Yw==", mediaType: "image/png" },
      ])
    );

    const cmd = imageNew();
    await cmd.parseAsync(["node", "test", "three images"]);

    expect(console.log).toHaveBeenCalledWith("Generated 3 image(s).");
  });

  it("should parse single -o option into providerOptions", async () => {
    vi.mocked(generateImage).mockResolvedValue(
      createMockImageResult([{ base64: "YQ==", mediaType: "image/png" }])
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
      createMockImageResult([{ base64: "YQ==", mediaType: "image/png" }])
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
});
