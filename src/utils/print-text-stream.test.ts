import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AsyncIterableStream } from "ai";
import { printTextStream } from "./print-text-stream";

describe("printTextStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  function createMockStream(chunks: string[]): AsyncIterableStream<string> {
    return (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })() as unknown as AsyncIterableStream<string>;
  }

  it("should write each chunk to stdout", async () => {
    await printTextStream(createMockStream(["Hello ", "world"]));

    expect(process.stdout.write).toHaveBeenCalledWith("Hello ");
    expect(process.stdout.write).toHaveBeenCalledWith("world");
  });

  it("should append newline at the end", async () => {
    await printTextStream(createMockStream(["output"]));

    expect(process.stdout.write).toHaveBeenLastCalledWith("\n");
  });

  it("should handle empty stream", async () => {
    await printTextStream(createMockStream([]));

    expect(process.stdout.write).toHaveBeenCalledTimes(1);
    expect(process.stdout.write).toHaveBeenCalledWith("\n");
  });

  it("should handle multiple chunks correctly", async () => {
    await printTextStream(createMockStream(["a", "b", "c"]));

    expect(process.stdout.write).toHaveBeenCalledTimes(4);
    expect(process.stdout.write).toHaveBeenNthCalledWith(1, "a");
    expect(process.stdout.write).toHaveBeenNthCalledWith(2, "b");
    expect(process.stdout.write).toHaveBeenNthCalledWith(3, "c");
    expect(process.stdout.write).toHaveBeenNthCalledWith(4, "\n");
  });
});
