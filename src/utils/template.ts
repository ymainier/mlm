import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml, YAMLParseError } from "yaml";

export interface Template {
  system?: string;
  prompt?: string;
  model?: string;
  options?: string[];
  attachments?: string[];
  schema?: string;
}

export class TemplateNotFoundError extends Error {
  readonly templateName: string;
  readonly templatePath: string;
  constructor(templateName: string, templatePath: string) {
    super(`Template not found: ${templateName}\nExpected at: ${templatePath}`);
    this.name = "TemplateNotFoundError";
    this.templateName = templateName;
    this.templatePath = templatePath;
  }
}

export class TemplateParseError extends Error {
  readonly templateName: string;
  constructor(templateName: string) {
    super(`Invalid YAML in template: ${templateName}`);
    this.name = "TemplateParseError";
    this.templateName = templateName;
  }
}

export function getTemplatePath(name: string): string {
  return join(homedir(), ".mlm", "templates", `${name}.yaml`);
}

export async function loadTemplate(name: string): Promise<Template> {
  const path = getTemplatePath(name);

  try {
    const content = await readFile(path, "utf-8");
    return parseYaml(content) as Template;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new TemplateNotFoundError(name, path);
    }
    if (error instanceof YAMLParseError) {
      throw new TemplateParseError(name);
    }
    throw error;
  }
}
