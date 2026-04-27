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
    try {
      await access(output, constants.F_OK);
      throw new Error(`Output file already exists: ${output}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

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
  const timestamp = Date.now();

  let defaultOutputDir = path.join(homedir(), "Downloads");
  try {
    await access(defaultOutputDir, constants.W_OK);
  } catch {
    defaultOutputDir = tmpdir();
  }

  return Promise.all(
    images.map(async (image, index) => {
      const filepath =
        outputs?.[index] ??
        path.join(
          defaultOutputDir,
          `image-${timestamp}-${index}.${image.mediaType?.split("/")[1] ?? "png"}`,
        );
      await writeFile(filepath, image.uint8Array);
      return filepath;
    }),
  );
}
