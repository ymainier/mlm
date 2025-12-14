import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamText as aiStreamText } from "ai";
import { streamText } from "./text";

vi.mock("ai", () => ({ streamText: vi.fn() }));

function createMockTextStream(chunks: string[]) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })(),
  };
}

describe("streamText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call onTextPart for each chunk in the stream", async () => {
    vi.mocked(aiStreamText).mockReturnValue(
      createMockTextStream(["Hello ", "world"]) as ReturnType<typeof aiStreamText>
    );
    const onTextPart = vi.fn();

    await streamText({
      model: "openai/gpt-5-mini",
      prompt: "test prompt",
      onTextPart,
    });

    expect(onTextPart).toHaveBeenCalledWith("Hello ");
    expect(onTextPart).toHaveBeenCalledWith("world");
  });

  it("should append newline at the end", async () => {
    vi.mocked(aiStreamText).mockReturnValue(
      createMockTextStream(["output"]) as ReturnType<typeof aiStreamText>
    );
    const onTextPart = vi.fn();

    await streamText({
      model: "openai/gpt-5-mini",
      prompt: "test prompt",
      onTextPart,
    });

    expect(onTextPart).toHaveBeenLastCalledWith("\n");
  });

  it("should pass model and prompt to AI SDK streamText", async () => {
    vi.mocked(aiStreamText).mockReturnValue(
      createMockTextStream([]) as ReturnType<typeof aiStreamText>
    );
    const onTextPart = vi.fn();

    await streamText({
      model: "anthropic/claude-3-haiku",
      prompt: "hello world",
      onTextPart,
    });

    expect(aiStreamText).toHaveBeenCalledWith({
      model: "anthropic/claude-3-haiku",
      prompt: "hello world",
    });
  });

  it("should pass system prompt when provided", async () => {
    vi.mocked(aiStreamText).mockReturnValue(
      createMockTextStream([]) as ReturnType<typeof aiStreamText>
    );
    const onTextPart = vi.fn();

    await streamText({
      system: "You are a helpful assistant.",
      model: "openai/gpt-5-mini",
      prompt: "test",
      onTextPart,
    });

    expect(aiStreamText).toHaveBeenCalledWith({
      system: "You are a helpful assistant.",
      model: "openai/gpt-5-mini",
      prompt: "test",
    });
  });

  it("should handle empty stream", async () => {
    vi.mocked(aiStreamText).mockReturnValue(
      createMockTextStream([]) as ReturnType<typeof aiStreamText>
    );
    const onTextPart = vi.fn();

    await streamText({
      model: "openai/gpt-5-mini",
      prompt: "test",
      onTextPart,
    });

    expect(onTextPart).toHaveBeenCalledTimes(1);
    expect(onTextPart).toHaveBeenCalledWith("\n");
  });

  it("should handle multiple chunks correctly", async () => {
    vi.mocked(aiStreamText).mockReturnValue(
      createMockTextStream(["a", "b", "c"]) as ReturnType<typeof aiStreamText>
    );
    const onTextPart = vi.fn();

    await streamText({
      model: "openai/gpt-5-mini",
      prompt: "test",
      onTextPart,
    });

    expect(onTextPart).toHaveBeenCalledTimes(4);
    expect(onTextPart).toHaveBeenNthCalledWith(1, "a");
    expect(onTextPart).toHaveBeenNthCalledWith(2, "b");
    expect(onTextPart).toHaveBeenNthCalledWith(3, "c");
    expect(onTextPart).toHaveBeenNthCalledWith(4, "\n");
  });
});
