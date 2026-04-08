import type { GeneratedFile } from "ai";
import { access, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

/**
 * Validates output paths before calling the model.
 * Checks that files don't already exist and directories are writable.
 * Throws an error with a descriptive message if validation fails.
 */
export async function validateOutputPaths(outputs: string[]): Promise<void> {
  for (const output of outputs) {
    // Check if file already exists
    try {
      await access(output, constants.F_OK);
      throw new Error(`Output file already exists: ${output}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err; // Re-throw if it's not "file not found"
      }
      // File doesn't exist - good
    }

    // Check if parent directory exists and is writable
    const dir = path.dirname(output);
    try {
      await access(dir, constants.W_OK);
    } catch {
      throw new Error(
        `Cannot write to directory: ${dir} (does not exist or not writable)`,
      );
    }
  }
}

export async function save(
  images: Array<GeneratedFile>,
  outputs?: string[],
): Promise<Array<string>> {
  const paths: Array<string> = [];
  const timestamp = Date.now();

  for (const [index, image] of images.entries()) {
    let filepath: string;
    const specifiedOutput = outputs?.[index];

    if (specifiedOutput) {
      filepath = specifiedOutput;
    } else {
      let outputDir = path.join(homedir(), "Downloads");
      try {
        await access(outputDir, constants.W_OK);
      } catch {
        outputDir = tmpdir();
      }
      const extension = image.mediaType?.split("/")[1] || "png";
      const filename = `image-${timestamp}-${index}.${extension}`;
      filepath = path.join(outputDir, filename);
    }

    await writeFile(filepath, image.uint8Array);
    paths.push(filepath);
  }

  return paths;
}
