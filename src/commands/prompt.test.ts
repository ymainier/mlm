import { describe, it, expect, vi, beforeEach } from "vitest";
import { prompt } from "./prompt";
import { getPrompt } from "../utils/input";
import { resolveFragments } from "../utils/fragments";
import { getMessages } from "../utils/get-messages";
import { printTextStream } from "../utils/print-text-stream";
import { streamText, generateObject, type ModelMessage } from "ai";
import { parseConciseJsonSchemaDsl } from "../utils/parse-concise-json-schema-dsl";
import {
  loadTemplate,
  TemplateNotFoundError,
  TemplateParseError,
} from "../utils/template";
import { exit } from "node:process";

vi.mock("../utils/input", () => ({ getPrompt: vi.fn(), readStdin: vi.fn() }));
vi.mock("../utils/get-messages", () => ({ getMessages: vi.fn() }));
vi.mock("../utils/fragments", () => ({ resolveFragments: vi.fn() }));
vi.mock("../utils/print-text-stream", () => ({ printTextStream: vi.fn() }));
vi.mock("ai", () => ({
  streamText: vi.fn(),
  generateObject: vi.fn(),
  jsonSchema: vi.fn((schema) => schema),
}));
vi.mock("../utils/parse-concise-json-schema-dsl", () => ({
  parseConciseJsonSchemaDsl: vi.fn(),
}));
vi.mock("../utils/template", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/template")>();
  return {
    ...actual,
    loadTemplate: vi.fn(),
  };
});
vi.mock("node:process", () => ({
  exit: vi.fn(),
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
    vi.mocked(resolveFragments).mockResolvedValue(undefined);
    vi.mocked(generateObject).mockResolvedValue({
      object: { result: "test" },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);
    vi.spyOn(console, "log").mockImplementation(() => {});
    // Default: default template not found (most tests don't use templates)
    vi.mocked(loadTemplate).mockRejectedValue(
      new TemplateNotFoundError("default", "/path/to/default.yaml"),
    );
  });

  it("should create a command named 'prompt'", () => {
    const cmd = prompt();
    expect(cmd.name()).toBe("prompt");
  });

  it("should call getPrompt with the input argument", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "test prompt"]);

    expect(getPrompt).toHaveBeenCalledWith("test prompt", undefined);
  });

  it("should call getMessages with the resolved prompt", async () => {
    vi.mocked(getPrompt).mockResolvedValue("resolved prompt");

    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "input"]);

    expect(getMessages).toHaveBeenCalledWith(
      undefined,
      "resolved prompt",
      [],
      undefined,
    );
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
      undefined,
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

    expect(getMessages).toHaveBeenCalledWith(undefined, "test", [], undefined);
  });

  it("should pass single attachment via -a option", async () => {
    const cmd = prompt();
    await cmd.parseAsync(["node", "test", "-a", "image.png", "describe this"]);

    expect(getMessages).toHaveBeenCalledWith(
      undefined,
      "describe this",
      ["image.png"],
      undefined,
    );
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

    expect(getMessages).toHaveBeenCalledWith(
      undefined,
      "summarize these",
      ["image.png", "document.pdf", "data.csv"],
      undefined,
    );
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

      expect(parseConciseJsonSchemaDsl).toHaveBeenCalledWith(
        "name str, age int",
      );
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
      await cmd.parseAsync(["node", "test", "-S", "", "test prompt"]);

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

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ name: "John Doe" }, null, 2),
      );
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
      await cmd.parseAsync(["node", "test", "-S", "x str", "generate"]);

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

  describe("--template option", () => {
    it("should call loadTemplate when -t option is provided", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({});

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "test prompt",
      ]);

      expect(loadTemplate).toHaveBeenCalledWith("my-template");
    });

    it("should try to load default template when -t option is not provided", async () => {
      const cmd = prompt();
      await cmd.parseAsync(["node", "test", "test prompt"]);

      expect(loadTemplate).toHaveBeenCalledWith("default");
    });

    it("should not error when default template does not exist", async () => {
      vi.mocked(loadTemplate).mockRejectedValue(
        new TemplateNotFoundError("default", "/path/to/default.yaml"),
      );

      const cmd = prompt();
      await cmd.parseAsync(["node", "test", "test prompt"]);

      expect(exit).not.toHaveBeenCalled();
      expect(streamText).toHaveBeenCalled();
    });

    it("should use default template values when default template exists", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        system: "default system",
        model: "anthropic/claude-3-haiku",
      });

      const cmd = prompt();
      await cmd.parseAsync(["node", "test", "test prompt"]);

      expect(loadTemplate).toHaveBeenCalledWith("default");
      expect(getMessages).toHaveBeenCalledWith(
        "default system",
        "test prompt",
        [],
        undefined,
      );
      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "anthropic/claude-3-haiku",
        }),
      );
    });

    it("should exit with error when default template has invalid YAML", async () => {
      vi.mocked(loadTemplate).mockRejectedValue(
        new TemplateParseError("default"),
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      // Make exit throw to stop execution
      const exitMock = vi.mocked(exit).mockImplementation(() => {
        throw new Error("exit");
      });

      const cmd = prompt();
      await expect(
        cmd.parseAsync(["node", "test", "test prompt"]),
      ).rejects.toThrow("exit");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid YAML in template: default",
      );
      expect(exit).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitMock.mockRestore();
    });

    it("should use template system when CLI system is not provided", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        system: "template system prompt",
      });

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "test prompt",
      ]);

      expect(getMessages).toHaveBeenCalledWith(
        "template system prompt",
        "test prompt",
        [],
        undefined,
      );
    });

    it("should use CLI system when both CLI and template provide system", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        system: "template system prompt",
      });

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "-s",
        "cli system prompt",
        "test prompt",
      ]);

      expect(getMessages).toHaveBeenCalledWith(
        "cli system prompt",
        "test prompt",
        [],
        undefined,
      );
    });

    it("should use template model when CLI model is not provided", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        model: "anthropic/claude-3-haiku",
      });

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "test prompt",
      ]);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "anthropic/claude-3-haiku",
        }),
      );
    });

    it("should use CLI model when both CLI and template provide model", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        model: "anthropic/claude-3-haiku",
      });

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "-m",
        "google/gemini-pro",
        "test prompt",
      ]);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "google/gemini-pro",
        }),
      );
    });

    it("should use default model when neither CLI nor template provide model", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({});

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "test prompt",
      ]);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "openai/gpt-5-mini",
        }),
      );
    });

    it("should concatenate template options with CLI options", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        options: ["openai.temperature=0.7"],
      });

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "-o",
        "openai.maxTokens=1000",
        "test prompt",
      ]);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            openai: { temperature: 0.7, maxTokens: 1000 },
          },
        }),
      );
    });

    it("should allow CLI options to override same-key template options", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        options: ["openai.temperature=0.7"],
      });

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "-o",
        "openai.temperature=0.9",
        "test prompt",
      ]);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            openai: { temperature: 0.9 },
          },
        }),
      );
    });

    it("should concatenate template attachments with CLI attachments", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        attachments: ["template-file.txt"],
      });

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "-a",
        "cli-file.txt",
        "test prompt",
      ]);

      expect(getMessages).toHaveBeenCalledWith(
        undefined,
        "test prompt",
        ["template-file.txt", "cli-file.txt"],
        undefined,
      );
    });

    it("should use template prompt when CLI prompt is not provided", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        prompt: "template prompt",
      });

      const cmd = prompt();
      await cmd.parseAsync(["node", "test", "-t", "my-template"]);

      expect(getPrompt).toHaveBeenCalledWith("template prompt", undefined);
    });

    it("should use CLI prompt when both CLI and template provide prompt", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        prompt: "template prompt",
      });

      const cmd = prompt();
      await cmd.parseAsync(["node", "test", "-t", "my-template", "cli prompt"]);

      expect(getPrompt).toHaveBeenCalledWith("cli prompt", undefined);
    });

    it("should use template schema when CLI schema is not provided", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        schema: "name str",
      });
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
        "-t",
        "my-template",
        "test prompt",
      ]);

      expect(parseConciseJsonSchemaDsl).toHaveBeenCalledWith("name str");
      expect(generateObject).toHaveBeenCalled();
    });

    it("should use CLI schema when both CLI and template provide schema", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({
        schema: "template-field str",
      });
      const mockSchema = {
        type: "object" as const,
        properties: { cliField: { type: "string" as const } },
        required: ["cliField"],
      };
      vi.mocked(parseConciseJsonSchemaDsl).mockReturnValue(mockSchema);

      const cmd = prompt();
      await cmd.parseAsync([
        "node",
        "test",
        "-t",
        "my-template",
        "-S",
        "cliField str",
        "test prompt",
      ]);

      expect(parseConciseJsonSchemaDsl).toHaveBeenCalledWith("cliField str");
    });

    it("should exit with error when no prompt provided and template has no prompt", async () => {
      vi.mocked(loadTemplate).mockResolvedValue({});
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const cmd = prompt();
      await cmd.parseAsync(["node", "test", "-t", "my-template"]);

      expect(consoleSpy).toHaveBeenCalledWith(
        "No prompt provided. Supply a prompt argument or use a template with a prompt.",
      );
      expect(exit).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
    });
  });
});
