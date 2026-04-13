import { describe, it, expect, vi } from "vitest";
import { resolveModel } from "./resolve-model";

vi.mock("ollama-ai-provider-v2", () => ({
  ollama: vi.fn((modelId: string) => ({ type: "ollama-model", modelId })),
}));

describe("resolveModel", () => {
  it("returns the string unchanged for gateway models", () => {
    expect(resolveModel("openai/gpt-5-mini")).toBe("openai/gpt-5-mini");
    expect(resolveModel("anthropic/claude-3-haiku")).toBe(
      "anthropic/claude-3-haiku",
    );
    expect(resolveModel("google/gemini-2.5-flash")).toBe(
      "google/gemini-2.5-flash",
    );
  });

  it("returns an ollama LanguageModel for ollama/ prefix", async () => {
    const { ollama } = await import("ollama-ai-provider-v2");
    const result = resolveModel("ollama/qwen3:8b");
    expect(ollama).toHaveBeenCalledWith("qwen3:8b");
    expect(result).toEqual({ type: "ollama-model", modelId: "qwen3:8b" });
  });

  it("strips only the ollama/ prefix, preserving the full model id", async () => {
    const { ollama } = await import("ollama-ai-provider-v2");
    resolveModel("ollama/deepseek-r1:70b");
    expect(ollama).toHaveBeenCalledWith("deepseek-r1:70b");
  });
});
