import { describe, it, expect, vi, beforeEach } from "vitest";
import { prompt } from "./prompt";
import { getPrompt } from "../utils/input";
import { getMessages } from "../utils/get-messages";
import { printTextStream } from "../utils/print-text-stream";
import { streamText, type ModelMessage } from "ai";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn() }));
vi.mock("../utils/get-messages", () => ({ getMessages: vi.fn() }));
vi.mock("../utils/print-text-stream", () => ({ printTextStream: vi.fn() }));
vi.mock("ai", () => ({ streamText: vi.fn() }));

describe("prompt command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrompt).mockImplementation(async (input) => input);
    vi.mocked(getMessages).mockResolvedValue([
      { role: "user", content: [{ type: "text", text: "test" }] },
    ]);
    vi.mocked(streamText).mockReturnValue({
      textStream: (async function* () {})(),
    } as unknown as ReturnType<typeof streamText>);
    vi.mocked(printTextStream).mockResolvedValue(undefined);
  });

  it("should create a command named 'prompt'", () => {
    const cmd = prompt();
    expect(cmd.name()).toBe("prompt");
  });

  it("should call getPrompt with the input argument", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test prompt"]);

    expect(getPrompt).toHaveBeenCalledWith("test prompt");
  });

  it("should call getMessages with the resolved prompt", async () => {
    vi.mocked(getPrompt).mockResolvedValue("resolved prompt");

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "input"]);

    expect(getMessages).toHaveBeenCalledWith(undefined, "resolved prompt", []);
  });

  it("should call streamText with messages from getMessages", async () => {
    const mockMessages: ModelMessage[] = [
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ];
    vi.mocked(getMessages).mockResolvedValue(mockMessages);

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "hello"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: mockMessages,
      }),
    );
  });

  it("should use default model openai/gpt-5-mini", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test prompt"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-5-mini",
      }),
    );
  });

  it("should accept a custom model via -m option", async () => {
    const cmd = prompt();
    await cmd.parseAsync([
      "node",
      "test",
      "-m",
      "anthropic/claude-3-haiku",
      "test prompt",
    ]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "anthropic/claude-3-haiku",
      }),
    );
  });

  it("should pass system prompt to getMessages", async () => {
    const cmd = prompt();
    await cmd.parseAsync([
      "node",
      "test",
      "--system",
      "You are a helpful assistant.",
      "test prompt",
    ]);

    expect(getMessages).toHaveBeenCalledWith(
      "You are a helpful assistant.",
      "test prompt",
      [],
    );
  });

  it("should call printTextStream with the textStream", async () => {
    const mockTextStream = (async function* () {
      yield "hello";
    })();
    vi.mocked(streamText).mockReturnValue({
      textStream: mockTextStream,
    } as unknown as ReturnType<typeof streamText>);

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test"]);

    expect(printTextStream).toHaveBeenCalledWith(mockTextStream);
  });

  it("should pass empty providerOptions by default", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {},
      }),
    );
  });

  it("should parse single -o option into providerOptions", async () => {
    const cmd = prompt();
    await cmd.parseAsync([
      "node",
      "test",
      "-o",
      "openai.reasoningEffort=low",
      "test",
    ]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: { openai: { reasoningEffort: "low" } },
      }),
    );
  });

  it("should parse multiple -o options into providerOptions", async () => {
    const cmd = prompt();
    await cmd.parseAsync([
      "node",
      "test",
      "-o",
      "openai.reasoningEffort=low",
      "-o",
      "openai.user=user123",
      "test",
    ]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {
          openai: { reasoningEffort: "low", user: "user123" },
        },
      }),
    );
  });

  it("should coerce boolean and number values in -o options", async () => {
    const cmd = prompt();
    await cmd.parseAsync([
      "node",
      "test",
      "-o",
      "openai.logprobs=true",
      "-o",
      "openai.maxTokens=1000",
      "test",
    ]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: { openai: { logprobs: true, maxTokens: 1000 } },
      }),
    );
  });

  it("should pass empty attachments by default", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test"]);

    expect(getMessages).toHaveBeenCalledWith(undefined, "test", []);
  });

  it("should pass single attachment via -a option", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "-a", "image.png", "describe this"]);

    expect(getMessages).toHaveBeenCalledWith(undefined, "describe this", [
      "image.png",
    ]);
  });

  it("should pass multiple attachments via repeated -a options", async () => {
    const cmd = prompt();
    await cmd.parseAsync([
      "node",
      "test",
      "-a",
      "image.png",
      "-a",
      "document.pdf",
      "--attachment",
      "data.csv",
      "summarize these",
    ]);

    expect(getMessages).toHaveBeenCalledWith(undefined, "summarize these", [
      "image.png",
      "document.pdf",
      "data.csv",
    ]);
  });
});
