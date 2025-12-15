import type { GeneratedFile } from "ai";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function save(
  images: Array<GeneratedFile>,
): Promise<Array<string>> {
  const paths: Array<string> = [];
  const outputDir = tmpdir();
  const timestamp = Date.now();

  for (const [index, image] of images.entries()) {
    const extension = image.mediaType?.split("/")[1] || "png";
    const filename = `image-${timestamp}-${index}.${extension}`;
    const filepath = path.join(outputDir, filename);

    await writeFile(filepath, image.uint8Array);
    paths.push(filepath);
  }

  return paths;
}
