import type { JSONValue } from "ai";
import { Option } from "commander";

export type ProviderOptions = Record<string, Record<string, JSONValue>>;

export function parseProviderOptions(options: string[]): ProviderOptions {
  const result: ProviderOptions = {};

  for (const opt of options) {
    const match = opt.match(/^([^.]+)\.([^=]+)=(.*)$/);
    if (!match) {
      throw new Error(
        `Invalid option format: "${opt}". Expected: provider.key=value`,
      );
    }

    const provider = match[1]!;
    const key = match[2]!;
    const rawValue = match[3]!;
    const value = coerceValue(rawValue);

    result[provider] = result[provider] ?? {};
    result[provider]![key] = value;
  }

  return result;
}

function coerceValue(value: string): JSONValue {
  if (value === "true") return true;
  if (value === "false") return false;

  const num = Number(value);
  if (!isNaN(num) && value !== "") return num;

  return value;
}

export function collect(value: string, prev: string[]): string[] {
  return prev.concat([value]);
}

export function modelOption(defaultModel?: string): Option {
  const opt = new Option("-m, --model <provider/model>", "model to use");
  if (defaultModel) opt.default(defaultModel);
  return opt;
}

export function providerOption(): Option {
  return new Option(
    "-o, --option <provider.key=value>",
    "provider option (repeatable)",
  )
    .argParser(collect)
    .default([]);
}

export function attachmentOption(): Option {
  return new Option("-a, --attachment <path>", "file attachment (repeatable)")
    .argParser(collect)
    .default([]);
}

export function fragmentOption(): Option {
  return new Option(
    "-f, --fragment <source>",
    "fragment to prepend to prompt: file path, URL, or - for stdin (repeatable)",
  )
    .argParser(collect)
    .default([]);
}

export function outputOption(): Option {
  return new Option(
    "-O, --output <path>",
    "output file path (repeatable, extras saved to temp)",
  )
    .argParser(collect)
    .default([]);
}
