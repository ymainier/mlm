import { describe, it, expect, vi, beforeEach } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";

const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: mockReadFile,
}));

import {
  loadTemplate,
  getTemplatePath,
  TemplateNotFoundError,
  TemplateParseError,
} from "./template";

describe("loadTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return parsed template when file exists", async () => {
    const template = {
      system: "You are helpful",
      prompt: "Hello",
      model: "openai/gpt-4",
      options: ["openai.temperature=0.7"],
      attachments: ["file.txt"],
      schema: "name str",
    };
    mockReadFile.mockResolvedValue(JSON.stringify(template));

    const result = await loadTemplate("my-template");

    expect(mockReadFile).toHaveBeenCalledWith(
      join(homedir(), ".mlm", "templates", "my-template.json"),
      "utf-8",
    );
    expect(result).toEqual(template);
  });

  it("should handle template with only some fields", async () => {
    const template = { system: "Be brief" };
    mockReadFile.mockResolvedValue(JSON.stringify(template));

    const result = await loadTemplate("partial");

    expect(result).toEqual(template);
  });

  it("should handle empty template", async () => {
    mockReadFile.mockResolvedValue("{}");

    const result = await loadTemplate("empty");

    expect(result).toEqual({});
  });

  it("should throw TemplateNotFoundError when template not found", async () => {
    const error = new Error("ENOENT") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    mockReadFile.mockRejectedValue(error);

    await expect(loadTemplate("missing")).rejects.toThrow(
      TemplateNotFoundError,
    );
    await expect(loadTemplate("missing")).rejects.toMatchObject({
      templateName: "missing",
      templatePath: join(homedir(), ".mlm", "templates", "missing.json"),
    });
  });

  it("should throw TemplateParseError for invalid JSON", async () => {
    mockReadFile.mockResolvedValue("{ invalid json }");

    await expect(loadTemplate("bad-json")).rejects.toThrow(TemplateParseError);
    await expect(loadTemplate("bad-json")).rejects.toMatchObject({
      templateName: "bad-json",
    });
  });

  it("should rethrow unexpected errors", async () => {
    const unexpectedError = new Error("Permission denied");
    mockReadFile.mockRejectedValue(unexpectedError);

    await expect(loadTemplate("no-permission")).rejects.toThrow(
      "Permission denied",
    );
  });
});

describe("getTemplatePath", () => {
  it("should return correct path for template name", () => {
    const path = getTemplatePath("my-template");
    expect(path).toBe(join(homedir(), ".mlm", "templates", "my-template.json"));
  });
});
