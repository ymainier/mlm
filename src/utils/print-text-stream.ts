import type { AsyncIterableStream } from "ai";

export async function printTextStream(
  textStream: AsyncIterableStream<string>,
): Promise<void> {
  for await (const textPart of textStream) {
    process.stdout.write(textPart);
  }
  process.stdout.write("\n");
}
