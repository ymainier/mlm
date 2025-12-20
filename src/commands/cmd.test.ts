import { describe, it, expect, vi, beforeEach } from "vitest";
import { cmd } from "./cmd";
import { getPrompt } from "../utils/input";
import { getMessages } from "../utils/get-messages";
import { printTextStream } from "../utils/print-text-stream";
import { streamText, type ModelMessage } from "ai";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn() }));
vi.mock("../utils/get-messages", () => ({ getMessages: vi.fn() }));
vi.mock("../utils/print-text-stream", () => ({ printTextStream: vi.fn() }));
vi.mock("ai", () => ({ streamText: vi.fn() }));

describe("cmd command", () => {
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

  it("should create a command named 'cmd'", () => {
    const command = cmd();
    expect(command.name()).toBe("cmd");
  });

  it("should call getPrompt with the input argument", async () => {
    const command = cmd();
    await command.parseAsync(["node", "test", "undo last git commit"]);

    expect(getPrompt).toHaveBeenCalledWith("undo last git commit");
  });

  it("should call getMessages with the command-specific system prompt", async () => {
    vi.mocked(getPrompt).mockResolvedValue("resolved prompt");

    const command = cmd();
    await command.parseAsync(["node", "test", "input"]);

    expect(getMessages).toHaveBeenCalledWith(
      expect.stringContaining(
        "Return only the command to be executed as a raw string",
      ),
      "resolved prompt",
    );
  });

  it("should call streamText with messages from getMessages", async () => {
    const mockMessages: ModelMessage[] = [
      { role: "system", content: "system prompt" },
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ];
    vi.mocked(getMessages).mockResolvedValue(mockMessages);

    const command = cmd();
    await command.parseAsync(["node", "test", "hello world"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: mockMessages,
      }),
    );
  });

  it("should use default model openai/gpt-5-mini", async () => {
    const command = cmd();
    await command.parseAsync(["node", "test", "test prompt"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-5-mini",
      }),
    );
  });

  it("should accept a custom model via -m option", async () => {
    const command = cmd();
    await command.parseAsync([
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

  it("should accept a custom model via --model option", async () => {
    const command = cmd();
    await command.parseAsync([
      "node",
      "test",
      "--model",
      "google/gemini-pro",
      "test prompt",
    ]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "google/gemini-pro",
      }),
    );
  });

  it("should call printTextStream with the textStream", async () => {
    const mockTextStream = (async function* () {
      yield "hello";
    })();
    vi.mocked(streamText).mockReturnValue({
      textStream: mockTextStream,
    } as unknown as ReturnType<typeof streamText>);

    const command = cmd();
    await command.parseAsync(["node", "test", "test"]);

    expect(printTextStream).toHaveBeenCalledWith(mockTextStream);
  });

  it("should pass empty providerOptions by default", async () => {
    const command = cmd();
    await command.parseAsync(["node", "test", "test"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {},
      }),
    );
  });

  it("should parse single -o option into providerOptions", async () => {
    const command = cmd();
    await command.parseAsync([
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
    const command = cmd();
    await command.parseAsync([
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
});
