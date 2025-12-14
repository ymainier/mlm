import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { exit } from "node:process";
import { experimental_generateImage as generateImage } from "ai";
import { Command } from "commander";
import { getPrompt } from "../utils/input";
import { collect, parseProviderOptions } from "../utils/options";

export function imageNew() {
  const cmd = new Command("image-new");

  cmd
    .option(
      "-m, --model <provider/model>",
      "image model to use",
      "google/imagen-4.0-fast-generate-001",
    )
    .option(
      "-o, --option <provider.key=value>",
      "provider option (repeatable)",
      collect,
      [],
    )
    .argument("<prompt>", "description of the image (use - for stdin)")
    .action(
      async (
        input: string,
        { model, option }: { model: string; option: string[] },
      ) => {
        const prompt = await getPrompt(input);
        const providerOptions = parseProviderOptions(option);
        let result;
        try {
          result = await generateImage({ model, prompt, providerOptions });
        } catch (error) {
          console.error("Error generating image:", error);
          exit(1);
        }

        console.log(`Generated ${result.images.length} image(s).`);

        const outputDir = tmpdir();
        const timestamp = Date.now();

        for (const [index, image] of result.images.entries()) {
          const extension = image.mediaType?.split("/")[1] || "png";
          const filename = `image-${timestamp}-${index}.${extension}`;
          const filepath = path.join(outputDir, filename);

          const buffer = Buffer.from(image.base64, "base64");
          await writeFile(filepath, buffer);
          console.log(filepath);
        }

        if (result.images.length === 0) {
          console.error("No images were generated.");
          exit(1);
        }
      },
    );

  return cmd;
}
