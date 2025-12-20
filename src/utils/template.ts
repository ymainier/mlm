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
  constructor(
    public readonly templateName: string,
    public readonly templatePath: string,
  ) {
    super(`Template not found: ${templateName}\nExpected at: ${templatePath}`);
    this.name = "TemplateNotFoundError";
  }
}

export class TemplateParseError extends Error {
  constructor(public readonly templateName: string) {
    super(`Invalid YAML in template: ${templateName}`);
    this.name = "TemplateParseError";
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
