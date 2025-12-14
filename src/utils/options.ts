import type { JSONValue } from "ai";

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
