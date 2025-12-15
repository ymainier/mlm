import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateText } from "ai";
import { image } from "./image";
import { getPrompt } from "../utils/input";
import { save } from "../utils/images";
import { readFile } from "node:fs/promises";
import { exit } from "node:process";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn() }));

vi.mock("ai", () => ({ generateText: vi.fn() }));

vi.mock("../utils/images", () => ({
  save: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

vi.mock("node:process", () => ({
  exit: vi.fn(),
}));

function createMockTextResult(
  files: Array<{ mediaType: string; uint8Array: Uint8Array }>,
): Awaited<ReturnType<typeof generateText>> {
  return { files } as unknown as Awaited<ReturnType<typeof generateText>>;
}

describe("image command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getPrompt).mockImplementation(async (input) => input);
    vi.mocked(save).mockResolvedValue(["/tmp/image-123-0.png"]);
  });

  it("should create a command named 'image'", () => {
    const cmd = image();
    expect(cmd.name()).toBe("image");
  });

  it("should call generateText with prompt and system message", async () => {
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1, 2, 3]) },
      ]),
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
      }),
    );
  });

  it("should use custom model when specified", async () => {
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
      ]),
    );

    const cmd = image();
    await cmd.parseAsync([
      "node",
      "test",
      "-m",
      "openai/gpt-4-vision",
      "a dog",
    ]);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-4-vision",
      }),
    );
  });

  it("should read and include input image when provided", async () => {
    const mockImageBuffer = Buffer.from("fake image data");
    vi.mocked(readFile).mockResolvedValue(mockImageBuffer);
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
      ]),
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
      }),
    );
  });

  it("should detect jpeg media type for jpg images", async () => {
    const mockImageBuffer = Buffer.from("fake jpeg data");
    vi.mocked(readFile).mockResolvedValue(mockImageBuffer);
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
      ]),
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
      }),
    );
  });

  it("should call save with generated images", async () => {
    const mockUint8Array = new Uint8Array([1, 2, 3, 4]);
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: mockUint8Array },
      ]),
    );

    const cmd = image();
    await cmd.parseAsync(["node", "test", "a sunset"]);

    expect(save).toHaveBeenCalledWith([
      expect.objectContaining({
        mediaType: "image/png",
        uint8Array: mockUint8Array,
      }),
    ]);
  });

  it("should exit with code 1 when no images are generated", async () => {
    vi.mocked(generateText).mockResolvedValue(createMockTextResult([]));

    const cmd = image();
    await cmd.parseAsync(["node", "test", "something"]);

    expect(console.error).toHaveBeenCalledWith("No images were generated.");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("should call save with multiple generated images", async () => {
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
        { mediaType: "image/jpeg", uint8Array: new Uint8Array([2]) },
      ]),
    );

    const cmd = image();
    await cmd.parseAsync(["node", "test", "two images"]);

    expect(save).toHaveBeenCalledWith([
      expect.objectContaining({ mediaType: "image/png" }),
      expect.objectContaining({ mediaType: "image/jpeg" }),
    ]);
  });

  it("should pass empty providerOptions by default", async () => {
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
      ]),
    );

    const cmd = image();
    await cmd.parseAsync(["node", "test", "test"]);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {},
      }),
    );
  });

  it("should parse single -o option into providerOptions", async () => {
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
      ]),
    );

    const cmd = image();
    await cmd.parseAsync([
      "node",
      "test",
      "-o",
      "google.safetySettings=none",
      "test",
    ]);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: { google: { safetySettings: "none" } },
      }),
    );
  });

  it("should parse multiple -o options into providerOptions", async () => {
    vi.mocked(generateText).mockResolvedValue(
      createMockTextResult([
        { mediaType: "image/png", uint8Array: new Uint8Array([1]) },
      ]),
    );

    const cmd = image();
    await cmd.parseAsync([
      "node",
      "test",
      "-o",
      "google.safetySettings=none",
      "-o",
      "google.maxTokens=2000",
      "test",
    ]);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {
          google: { safetySettings: "none", maxTokens: 2000 },
        },
      }),
    );
  });
});
