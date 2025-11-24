import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { streamText } from "ai";
import { prompt } from "./prompt";
import { readStdin } from "../utils/input";

vi.mock("../utils/input", () => ({ readStdin: vi.fn() }));

vi.mock("ai", () => ({ streamText: vi.fn() }));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => ({ name: "gpt-5-nano" })),
}));

function createMockStream(chunks: string[]): ReturnType<typeof streamText> {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })(),
  } as unknown as ReturnType<typeof streamText>;
}

function mockProcessStdinIsTTY(isTTY: boolean) {
  Object.defineProperty(process.stdin, "isTTY", {
    value: isTTY,
    writable: true,
    configurable: true,
  });
}

describe("prompt command", () => {
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
  });

  it("should create a command named 'prompt'", () => {
    const cmd = prompt();
    expect(cmd.name()).toBe("prompt");
  });

  it("should accept a prompt argument", () => {
    const cmd = prompt();
    expect(cmd.name()).toBe("prompt");
  });

  it("should stream text for a direct prompt string", async () => {
    vi.mocked(streamText).mockReturnValue(
      createMockStream(["Hello ", "world"])
    );

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test prompt"]);

    expect(process.stdout.write).toHaveBeenCalledWith("Hello ");
    expect(process.stdout.write).toHaveBeenCalledWith("world");
    expect(console.log).toHaveBeenCalledWith();
  });

  it("should read from stdin when prompt is '-' and input is piped", async () => {
    vi.mocked(streamText).mockReturnValue(createMockStream(["response"]));
    vi.mocked(readStdin).mockResolvedValue("piped prompt");
    mockProcessStdinIsTTY(false);

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "-"]);

    expect(readStdin).toHaveBeenCalled();
    expect(process.stdout.write).toHaveBeenCalledWith("response");
  });

  it("should not read from stdin when prompt is '-' but input is not piped", async () => {
    vi.mocked(streamText).mockReturnValue(createMockStream(["response"]));
    mockProcessStdinIsTTY(true);

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "-"]);

    expect(readStdin).not.toHaveBeenCalled();
    expect(process.stdout.write).toHaveBeenCalledWith("response");
  });

  it("should call streamText with the correct model and prompt", async () => {
    vi.mocked(streamText).mockReturnValue(createMockStream(["test"]));

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "hello world"]);

    expect(streamText).toHaveBeenCalledWith({
      model: expect.objectContaining({ name: "gpt-5-nano" }),
      prompt: "hello world",
    });
  });

  it("should handle multiple stream chunks", async () => {
    vi.mocked(streamText).mockReturnValue(
      createMockStream(["chunk1", "chunk2", "chunk3"])
    );

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test"]);

    expect(process.stdout.write).toHaveBeenCalledTimes(3);
    expect(process.stdout.write).toHaveBeenNthCalledWith(1, "chunk1");
    expect(process.stdout.write).toHaveBeenNthCalledWith(2, "chunk2");
    expect(process.stdout.write).toHaveBeenNthCalledWith(3, "chunk3");
  });

  it("should append newline at the end", async () => {
    vi.mocked(streamText).mockReturnValue(createMockStream(["output"]));

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test"]);

    expect(console.log).toHaveBeenCalledWith();
  });

  it("should handle empty stream", async () => {
    vi.mocked(streamText).mockReturnValue(createMockStream([]));

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test"]);

    expect(console.log).toHaveBeenCalledWith();
  });
});
