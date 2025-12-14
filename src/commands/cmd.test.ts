import { describe, it, expect, vi, beforeEach } from "vitest";
import { cmd } from "./cmd";
import { getPrompt } from "../utils/input";
import { streamText } from "../utils/text";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn() }));

vi.mock("../utils/text", () => ({ streamText: vi.fn() }));

describe("cmd command", () => {
  beforeEach(() => {
    vi.mocked(getPrompt).mockImplementation(async (input) => input);
    vi.mocked(streamText).mockResolvedValue(undefined);
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

  it("should call streamText with the resolved prompt", async () => {
    vi.mocked(getPrompt).mockResolvedValue("resolved prompt");

    const command = cmd();
    await command.parseAsync(["node", "test", "input"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "resolved prompt",
      })
    );
  });

  it("should include the command-specific system prompt", async () => {
    const command = cmd();
    await command.parseAsync(["node", "test", "hello world"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(
          "Return only the command to be executed as a raw string"
        ),
      })
    );
  });

  it("should use default model openai/gpt-5-mini", async () => {
    const command = cmd();
    await command.parseAsync(["node", "test", "test prompt"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-5-mini",
      })
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
      })
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
      })
    );
  });

  it("should pass onTextPart callback bound to stdout.write", async () => {
    const command = cmd();
    await command.parseAsync(["node", "test", "test"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        onTextPart: expect.any(Function),
      })
    );
  });

  it("should pass empty providerOptions by default", async () => {
    const command = cmd();
    await command.parseAsync(["node", "test", "test"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {},
      })
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
      })
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
        providerOptions: { openai: { reasoningEffort: "low", user: "user123" } },
      })
    );
  });
});
