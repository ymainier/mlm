import { describe, it, expect, vi, beforeEach } from "vitest";
import { prompt } from "./prompt";
import { getPrompt } from "../utils/input";
import { getMessages } from "../utils/get-messages";
import { printTextStream } from "../utils/print-text-stream";
import { streamText, generateObject, type ModelMessage } from "ai";
import { parseConciseJsonSchemaDsl } from "../utils/parse-concise-json-schema-dsl";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn() }));
vi.mock("../utils/get-messages", () => ({ getMessages: vi.fn() }));
vi.mock("../utils/print-text-stream", () => ({ printTextStream: vi.fn() }));
vi.mock("ai", () => ({
  streamText: vi.fn(),
  generateObject: vi.fn(),
  jsonSchema: vi.fn((schema) => schema),
}));
vi.mock("../utils/parse-concise-json-schema-dsl", () => ({
  parseConciseJsonSchemaDsl: vi.fn(),
}));

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
    vi.mocked(parseConciseJsonSchemaDsl).mockReturnValue(undefined);
    vi.mocked(generateObject).mockResolvedValue({
      object: { result: "test" },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);
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

  describe("--schema option", () => {
    it("should parse schema with parseConciseJsonSchemaDsl when -S is provided", async () => {
      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-S",
        "name str, age int",
        "test prompt",
      ]);

      expect(parseConciseJsonSchemaDsl).toHaveBeenCalledWith("name str, age int");
    });

    it("should use generateObject when schema is valid", async () => {
      const mockSchema = {
        type: "object" as const,
        properties: { name: { type: "string" as const } },
        required: ["name"],
      };
      vi.mocked(parseConciseJsonSchemaDsl).mockReturnValue(mockSchema);

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-S",
        "name str",
        "generate a name",
      ]);

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "openai/gpt-5-mini",
          schema: mockSchema,
        }),
      );
      expect(streamText).not.toHaveBeenCalled();
    });

    it("should use streamText when schema is invalid (returns undefined)", async () => {
      vi.mocked(parseConciseJsonSchemaDsl).mockReturnValue(undefined);

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-S",
        "",
        "test prompt",
      ]);

      expect(streamText).toHaveBeenCalled();
      expect(generateObject).not.toHaveBeenCalled();
    });

    it("should use streamText when --schema is not provided", async () => {
      const cmd = prompt();
      await cmd.parseAsync(["node", "test", "test prompt"]);

      expect(streamText).toHaveBeenCalled();
      expect(generateObject).not.toHaveBeenCalled();
      expect(parseConciseJsonSchemaDsl).not.toHaveBeenCalled();
    });

    it("should log the generated object to console", async () => {
      const mockSchema = {
        type: "object" as const,
        properties: { name: { type: "string" as const } },
        required: ["name"],
      };
      vi.mocked(parseConciseJsonSchemaDsl).mockReturnValue(mockSchema);
      vi.mocked(generateObject).mockResolvedValue({
        object: { name: "John Doe" },
      } as unknown as Awaited<ReturnType<typeof generateObject>>);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-S",
        "name str",
        "generate a name",
      ]);

      expect(consoleSpy).toHaveBeenCalledWith({ name: "John Doe" });
      consoleSpy.mockRestore();
    });

    it("should pass messages to generateObject", async () => {
      const mockMessages: ModelMessage[] = [
        { role: "user", content: [{ type: "text", text: "generate" }] },
      ];
      vi.mocked(getMessages).mockResolvedValue(mockMessages);
      const mockSchema = {
        type: "object" as const,
        properties: { x: { type: "string" as const } },
        required: ["x"],
      };
      vi.mocked(parseConciseJsonSchemaDsl).mockReturnValue(mockSchema);

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-S",
        "x str",
        "generate",
      ]);

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: mockMessages,
        }),
      );
    });

    it("should pass providerOptions to generateObject", async () => {
      const mockSchema = {
        type: "object" as const,
        properties: { x: { type: "string" as const } },
        required: ["x"],
      };
      vi.mocked(parseConciseJsonSchemaDsl).mockReturnValue(mockSchema);

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-S",
        "x str",
        "-o",
        "openai.temperature=0.5",
        "generate",
      ]);

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: { openai: { temperature: 0.5 } },
        }),
      );
    });
  });
});
