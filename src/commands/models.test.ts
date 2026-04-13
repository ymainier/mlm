import { describe, it, expect, vi, beforeEach } from "vitest";
import { gateway } from "@ai-sdk/gateway";
import { models } from "./models.ts";

vi.mock("@ai-sdk/gateway", () => ({
  gateway: {
    getAvailableModels: vi.fn(),
  },
}));

const mockModels = [
  {
    id: "openai/gpt-4",
    modelType: "language",
    pricing: { input: "0.00003", output: "0.00006" },
  },
  {
    id: "openai/gpt-3.5-turbo",
    modelType: "language",
    pricing: { input: "0.000001", output: "0.000002" },
  },
  {
    id: "openai/text-embedding-3-small",
    modelType: "embedding",
    pricing: { input: "0.00000002", output: "0" },
  },
  {
    id: "openai/dall-e-3",
    modelType: "image",
    pricing: { input: "0", output: "0.04" },
  },
];

describe("models command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(gateway.getAvailableModels).mockResolvedValue({
      models: mockModels,
    } as Awaited<ReturnType<typeof gateway.getAvailableModels>>);
  });

  it("should create a command named 'models'", () => {
    const cmd = models();
    expect(cmd.name()).toBe("models");
  });

  it("should call gateway.getAvailableModels", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test"]);

    expect(gateway.getAvailableModels).toHaveBeenCalled();
  });

  it("should filter by language type", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "-t", "language"]);

    expect(console.log).toHaveBeenCalled();
    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    expect(output).toContain("gpt-4");
    expect(output).toContain("gpt-3.5-turbo");
    expect(output).not.toContain("dall-e-3");
    expect(output).not.toContain("text-embedding");
  });

  it("should filter by embedding type", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "-t", "embedding"]);

    expect(console.log).toHaveBeenCalled();
    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    expect(output).toContain("text-embedding");
    expect(output).not.toContain("gpt-4");
  });

  it("should filter by image type", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "-t", "image"]);

    expect(console.log).toHaveBeenCalled();
    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    expect(output).toContain("dall-e-3");
    expect(output).not.toContain("gpt-4");
  });

  it("should show all models when type is 'all'", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "-t", "all"]);

    expect(console.log).toHaveBeenCalled();
    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    expect(output).toContain("gpt-4");
    expect(output).toContain("dall-e-3");
    expect(output).toContain("text-embedding");
  });

  it("should sort by model name by default", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test"]);

    expect(console.log).toHaveBeenCalled();
    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    const lines = output.trim().split("\n");
    // Models should be alphabetically sorted
    expect(lines[0]).toContain("dall-e-3");
    expect(lines[1]).toContain("gpt-3.5-turbo");
    expect(lines[2]).toContain("gpt-4");
  });

  it("should sort by input price when specified", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "-s", "input"]);

    expect(console.log).toHaveBeenCalled();
    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    const lines = output.trim().split("\n");
    // Sorted by input price ascending (dall-e-3 and text-embedding have 0 input)
    expect(lines[0]).toMatch(/dall-e-3|text-embedding/);
  });

  it("should sort by output price when specified", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "-s", "output"]);

    expect(console.log).toHaveBeenCalled();
    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    const lines = output.trim().split("\n");
    // text-embedding has 0 output price, should be first
    expect(lines[0]).toContain("text-embedding");
  });

  it("should format prices as USD currency", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test"]);

    expect(console.log).toHaveBeenCalled();
    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    // Prices are multiplied by 1_000_000 and formatted as currency
    expect(output).toMatch(/\$[\d,.]+/);
  });

  it("should output only model names with --only-model", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "--only-model"]);

    expect(console.log).toHaveBeenCalledTimes(4);
    const calls = vi.mocked(console.log).mock.calls.map((c) => c[0]);
    expect(calls).toContain("openai/gpt-4");
    expect(calls).toContain("openai/gpt-3.5-turbo");
    expect(calls).toContain("openai/text-embedding-3-small");
    expect(calls).toContain("openai/dall-e-3");
  });

  it("should output only model names with -o shorthand", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "-o"]);

    expect(console.log).toHaveBeenCalledTimes(4);
  });

  it("should filter by type with --only-model", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "--only-model", "-t", "language"]);

    expect(console.log).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(console.log).mock.calls.map((c) => c[0]);
    expect(calls).toContain("openai/gpt-4");
    expect(calls).toContain("openai/gpt-3.5-turbo");
    expect(calls).not.toContain("openai/dall-e-3");
  });

  it("should sort with --only-model", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "--only-model"]);

    const calls = vi.mocked(console.log).mock.calls.map((c) => c[0]);
    // Models should be alphabetically sorted by default
    expect(calls[0]).toBe("openai/dall-e-3");
    expect(calls[1]).toBe("openai/gpt-3.5-turbo");
    expect(calls[2]).toBe("openai/gpt-4");
    expect(calls[3]).toBe("openai/text-embedding-3-small");
  });

  it("should not include pricing info with --only-model", async () => {
    const cmd = models();
    await cmd.parseAsync(["node", "test", "--only-model"]);

    const calls = vi.mocked(console.log).mock.calls.map((c) => c[0] as string);
    calls.forEach((output) => {
      expect(output).not.toMatch(/\$/);
    });
  });
});
