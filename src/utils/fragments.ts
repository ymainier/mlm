import { readFile } from "node:fs/promises";

async function resolveFragment(
  source: string,
  stdinContent: string | undefined,
): Promise<string> {
  if (source === "-") {
    return stdinContent ?? "";
  }
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch fragment ${source}: ${response.status}`);
    }
    return response.text();
  }
  return readFile(source, "utf-8");
}

export async function resolveFragments(
  sources: string[],
  stdinContent: string | undefined,
): Promise<string | undefined> {
  if (sources.length === 0) return undefined;
  const parts = await Promise.all(
    sources.map((s) => resolveFragment(s, stdinContent)),
  );
  return parts.join("\n\n");
}
