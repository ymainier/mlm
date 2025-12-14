import { describe, it, expect, vi, beforeEach } from "vitest";
import { prompt } from "./prompt";
import { getPrompt } from "../utils/input";
import { streamText } from "../utils/text";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn() }));

vi.mock("../utils/text", () => ({ streamText: vi.fn() }));

describe("prompt command", () => {
  beforeEach(() => {
    vi.mocked(getPrompt).mockImplementation(async (input) => input);
    vi.mocked(streamText).mockResolvedValue(undefined);
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

  it("should call streamText with the resolved prompt", async () => {
    vi.mocked(getPrompt).mockResolvedValue("resolved prompt");

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "input"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "resolved prompt",
      })
    );
  });

  it("should use default model openai/gpt-5-mini", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test prompt"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-5-mini",
      })
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
      })
    );
  });

  it("should accept a system prompt option", async () => {
    const cmd = prompt();
    await cmd.parseAsync([
      "node",
      "test",
      "--system",
      "You are a helpful assistant.",
      "test prompt",
    ]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "You are a helpful assistant.",
        prompt: "test prompt",
      })
    );
  });

  it("should pass onTextPart callback bound to stdout.write", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        onTextPart: expect.any(Function),
      })
    );
  });

  it("should pass empty providerOptions by default", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test"]);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {},
      })
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
      })
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
        providerOptions: { openai: { reasoningEffort: "low", user: "user123" } },
      })
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
      })
    );
  });
});
