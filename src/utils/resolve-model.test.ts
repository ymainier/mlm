import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveModel } from "./resolve-model.ts";

vi.mock("ollama-ai-provider-v2", () => ({
  ollama: vi.fn((modelId: string) => ({ type: "ollama-model", modelId })),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(({ apiKey }: { apiKey: string }) =>
    Object.assign(
      (modelId: string) => ({ type: "openrouter-model", modelId, apiKey }),
      { apiKey },
    ),
  ),
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

  describe("openrouter:", () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns an openrouter LanguageModel for openrouter: prefix", async () => {
      vi.stubEnv("OPENROUTER_API_KEY", "sk-test");
      const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
      const result = resolveModel("openrouter:deepseek/deepseek-v4-flash");
      expect(createOpenRouter).toHaveBeenCalledWith({ apiKey: "sk-test" });
      expect(result).toEqual({
        type: "openrouter-model",
        modelId: "deepseek/deepseek-v4-flash",
        apiKey: "sk-test",
      });
    });

    it("throws a clear error when OPENROUTER_API_KEY is not set", () => {
      vi.stubEnv("OPENROUTER_API_KEY", "");
      expect(() =>
        resolveModel("openrouter:deepseek/deepseek-v4-flash"),
      ).toThrow(/OPENROUTER_API_KEY/);
    });
  });
});
