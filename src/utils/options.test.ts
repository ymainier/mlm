import { describe, it, expect } from "vitest";
import {
  parseProviderOptions,
  collect,
  modelOption,
  providerOption,
  attachmentOption,
  outputOption,
} from "./options";

describe("parseProviderOptions", () => {
  it("should return empty object for empty array", () => {
    expect(parseProviderOptions([])).toEqual({});
  });

  it("should parse a single option", () => {
    const result = parseProviderOptions(["openai.reasoningEffort=low"]);
    expect(result).toEqual({
      openai: { reasoningEffort: "low" },
    });
  });

  it("should parse multiple options for the same provider", () => {
    const result = parseProviderOptions([
      "openai.reasoningEffort=low",
      "openai.user=user123",
    ]);
    expect(result).toEqual({
      openai: { reasoningEffort: "low", user: "user123" },
    });
  });

  it("should parse options for multiple providers", () => {
    const result = parseProviderOptions([
      "openai.reasoningEffort=low",
      "google.safetySettings=none",
    ]);
    expect(result).toEqual({
      openai: { reasoningEffort: "low" },
      google: { safetySettings: "none" },
    });
  });

  it("should coerce 'true' to boolean true", () => {
    const result = parseProviderOptions(["openai.logprobs=true"]);
    expect(result).toEqual({ openai: { logprobs: true } });
  });

  it("should coerce 'false' to boolean false", () => {
    const result = parseProviderOptions(["openai.store=false"]);
    expect(result).toEqual({ openai: { store: false } });
  });

  it("should coerce numeric strings to numbers", () => {
    const result = parseProviderOptions(["openai.maxTokens=1000"]);
    expect(result).toEqual({ openai: { maxTokens: 1000 } });
  });

  it("should coerce negative numbers", () => {
    const result = parseProviderOptions(["openai.bias=-5"]);
    expect(result).toEqual({ openai: { bias: -5 } });
  });

  it("should coerce floating point numbers", () => {
    const result = parseProviderOptions(["openai.temperature=0.7"]);
    expect(result).toEqual({ openai: { temperature: 0.7 } });
  });

  it("should keep regular strings as strings", () => {
    const result = parseProviderOptions(["openai.user=my-user-id"]);
    expect(result).toEqual({ openai: { user: "my-user-id" } });
  });

  it("should handle empty value", () => {
    const result = parseProviderOptions(["openai.key="]);
    expect(result).toEqual({ openai: { key: "" } });
  });

  it("should handle value with equals sign", () => {
    const result = parseProviderOptions(["openai.formula=a=b+c"]);
    expect(result).toEqual({ openai: { formula: "a=b+c" } });
  });

  it("should throw on missing dot separator", () => {
    expect(() => parseProviderOptions(["openai=value"])).toThrow(
      'Invalid option format: "openai=value". Expected: provider.key=value',
    );
  });

  it("should throw on missing equals sign", () => {
    expect(() => parseProviderOptions(["openai.key"])).toThrow(
      'Invalid option format: "openai.key". Expected: provider.key=value',
    );
  });

  it("should throw on completely invalid format", () => {
    expect(() => parseProviderOptions(["invalid"])).toThrow(
      'Invalid option format: "invalid". Expected: provider.key=value',
    );
  });
});

describe("collect", () => {
  it("should add value to empty array", () => {
    expect(collect("first", [])).toEqual(["first"]);
  });

  it("should append value to existing array", () => {
    expect(collect("second", ["first"])).toEqual(["first", "second"]);
  });

  it("should accumulate multiple values", () => {
    let result: string[] = [];
    result = collect("a", result);
    result = collect("b", result);
    result = collect("c", result);
    expect(result).toEqual(["a", "b", "c"]);
  });
});

describe("modelOption", () => {
  it("should have correct flags", () => {
    const opt = modelOption();
    expect(opt.flags).toBe("-m, --model <provider/model>");
  });

  it("should have correct description", () => {
    const opt = modelOption();
    expect(opt.description).toBe("model to use");
  });

  it("should have no default when not provided", () => {
    const opt = modelOption();
    expect(opt.defaultValue).toBeUndefined();
  });

  it("should set default when provided", () => {
    const opt = modelOption("openai/gpt-4");
    expect(opt.defaultValue).toBe("openai/gpt-4");
  });
});

describe("providerOption", () => {
  it("should have correct flags", () => {
    const opt = providerOption();
    expect(opt.flags).toBe("-o, --option <provider.key=value>");
  });

  it("should have correct description", () => {
    const opt = providerOption();
    expect(opt.description).toBe("provider option (repeatable)");
  });

  it("should have empty array as default", () => {
    const opt = providerOption();
    expect(opt.defaultValue).toEqual([]);
  });

  it("should have an argParser set", () => {
    const opt = providerOption();
    expect(opt.parseArg).toBeDefined();
  });
});

describe("attachmentOption", () => {
  it("should have correct flags", () => {
    const opt = attachmentOption();
    expect(opt.flags).toBe("-a, --attachment <path>");
  });

  it("should have correct description", () => {
    const opt = attachmentOption();
    expect(opt.description).toBe("file attachment (repeatable)");
  });

  it("should have empty array as default", () => {
    const opt = attachmentOption();
    expect(opt.defaultValue).toEqual([]);
  });

  it("should have an argParser set", () => {
    const opt = attachmentOption();
    expect(opt.parseArg).toBeDefined();
  });
});

describe("outputOption", () => {
  it("should have correct flags", () => {
    const opt = outputOption();
    expect(opt.flags).toBe("-O, --output <path>");
  });

  it("should have correct description", () => {
    const opt = outputOption();
    expect(opt.description).toBe(
      "output file path (repeatable, extras saved to temp)",
    );
  });

  it("should have empty array as default", () => {
    const opt = outputOption();
    expect(opt.defaultValue).toEqual([]);
  });

  it("should have an argParser set", () => {
    const opt = outputOption();
    expect(opt.parseArg).toBeDefined();
  });
});
