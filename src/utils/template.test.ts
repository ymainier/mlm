import { describe, it, expect, vi, beforeEach } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";

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
    mockReadFile.mockResolvedValue(stringifyYaml(template));

    const result = await loadTemplate("my-template");

    expect(mockReadFile).toHaveBeenCalledWith(
      join(homedir(), ".mlm", "templates", "my-template.yaml"),
      "utf-8",
    );
    expect(result).toEqual(template);
  });

  it("should handle template with only some fields", async () => {
    const template = { system: "Be brief" };
    mockReadFile.mockResolvedValue(stringifyYaml(template));

    const result = await loadTemplate("partial");

    expect(result).toEqual(template);
  });

  it("should handle empty template", async () => {
    mockReadFile.mockResolvedValue("");

    const result = await loadTemplate("empty");

    expect(result).toBeNull();
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
      templatePath: join(homedir(), ".mlm", "templates", "missing.yaml"),
    });
  });

  it("should throw TemplateParseError for invalid YAML", async () => {
    mockReadFile.mockResolvedValue("invalid: yaml: content:");

    await expect(loadTemplate("bad-yaml")).rejects.toThrow(TemplateParseError);
    await expect(loadTemplate("bad-yaml")).rejects.toMatchObject({
      templateName: "bad-yaml",
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
    expect(path).toBe(join(homedir(), ".mlm", "templates", "my-template.yaml"));
  });
});
