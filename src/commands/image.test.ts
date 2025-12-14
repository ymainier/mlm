import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateText } from "ai";
import { image } from "./image";
import { getPrompt } from "../utils/input";
import { writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { exit } from "node:process";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn() }));

vi.mock("ai", () => ({ generateText: vi.fn() }));

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("node:os", () => ({
  tmpdir: vi.fn(() => "/tmp"),
}));

vi.mock("node:process", () => ({
  exit: vi.fn(),
}));

function createMockTextResult(
  files: Array<{ mediaType: string; uint8Array: Uint8Array }>
): Awaited<ReturnType<typeof generateText>> {
  return { files } as unknown as Awaited<ReturnType<typeof generateText>>;
}

describe("image command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(getPrompt).mockImplementation(async (input) => input);
    vi.mocked(writeFile).mockResolvedValue(undefined);
  });

  it("should create a command named 'image'", () => {
    const cmd = image();
    expect(cmd.name()).toBe("image");
  });

  it("should call generateText with prompt and system message", async () => {
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1, 2, 3]) },
      ])
    );

    const cmd = image();
    await cmd.parseAsync(["node", "test", "a cat"]);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("generating images"),
        model: "google/gemini-2.5-flash-image",
        prompt: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({ type: "text", text: "a cat" }),
            ]),
          }),
        ]),
      })
    );
  });

  it("should use custom model when specified", async () => {
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([{ mediaType: "image/png", uint8Array: new Uint8Array([1]) }])
    );

    const cmd = image();
    await cmd.parseAsync(["node", "test", "-m", "openai/gpt-4-vision", "a dog"]);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-4-vision",
      })
    );
  });

  it("should read and include input image when provided", async () => {
    const mockImageBuffer = Buffer.from("fake image data");
    vi.mocked(readFile).mockResolvedValue(mockImageBuffer);
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([{ mediaType: "image/png", uint8Array: new Uint8Array([1]) }])
    );

    const cmd = image();
    await cmd.parseAsync([
      "node",
      "test",
      "-i",
      "/path/to/image.png",
      "edit this",
    ]);

    expect(readFile).toHaveBeenCalledWith("/path/to/image.png");
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "image",
                mediaType: "image/png",
                image: mockImageBuffer,
              }),
            ]),
          }),
        ]),
      })
    );
  });

  it("should detect jpeg media type for jpg images", async () => {
    const mockImageBuffer = Buffer.from("fake jpeg data");
    vi.mocked(readFile).mockResolvedValue(mockImageBuffer);
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([{ mediaType: "image/png", uint8Array: new Uint8Array([1]) }])
    );

    const cmd = image();
    await cmd.parseAsync([
      "node",
      "test",
      "-i",
      "/path/to/photo.jpg",
      "describe",
    ]);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "image",
                mediaType: "image/jpeg",
              }),
            ]),
          }),
        ]),
      })
    );
  });

  it("should write generated images to temp directory", async () => {
    const mockUint8Array = new Uint8Array([1, 2, 3, 4]);
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([{ mediaType: "image/png", uint8Array: mockUint8Array }])
    );

    const cmd = image();
    await cmd.parseAsync(["node", "test", "a sunset"]);

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/tmp\/image-\d+-0\.png$/),
      mockUint8Array
    );
  });

  it("should exit with code 1 when no images are generated", async () => {
    vi.mocked(generateText).mockResolvedValue(createMockTextResult([]));

    const cmd = image();
    await cmd.parseAsync(["node", "test", "something"]);

    expect(console.log).toHaveBeenCalledWith("No images were generated.");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("should handle multiple generated images", async () => {
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
        { mediaType: "image/jpeg", uint8Array: new Uint8Array([2]) },
      ])
    );

    const cmd = image();
    await cmd.parseAsync(["node", "test", "two images"]);

    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
      expect.any(Uint8Array)
    );
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpeg$/),
      expect.any(Uint8Array)
    );
  });
});
