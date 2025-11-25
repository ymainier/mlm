import { describe, it, expect } from "vitest";
import { getModel } from "./models";

describe("getModel", () => {
  it("should return openai model for valid openai provider", () => {
    const model = getModel("openai/gpt-4");
    expect(model).toBeDefined();
    expect(model.modelId).toBe("gpt-4");
  });

  it("should throw error for unsupported provider", () => {
    expect(() => getModel("unsupported/model-123")).toThrow(
      "Unsupported provider: unsupported"
    );
  });

  it("should throw error for missing provider and/or model", () => {
    expect(() => getModel("/gpt-4")).toThrow("Invalid model format");
    expect(() => getModel("openai/")).toThrow("Invalid model format");
    expect(() => getModel("openai-gpt-4")).toThrow("Invalid model format");
    expect(() => getModel("")).toThrow("Invalid model format");
  });
});
