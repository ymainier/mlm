import { writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { exit } from "node:process";
import { generateText, type UserContent } from "ai";
import { Command } from "commander";
import { getPrompt } from "../utils/input";
import { collect, parseProviderOptions } from "../utils/options";

const IMAGE_SYSTEM_PROMPT = `
You are an AI model specialized in generating images based on textual descriptions.
Generate high-quality images that accurately reflect the details and nuances of the provided prompts.
`.trim();

export function image() {
  const cmd = new Command("image");

  cmd
    .option(
      "-m, --model <provider/model>",
      "image model to use",
      "google/gemini-2.5-flash-image",
    )
    .option("-i, --image <path>", "path to input image file")
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
        {
          model,
          image,
          option,
        }: { model: string; image?: string; option: string[] },
      ) => {
        const system = IMAGE_SYSTEM_PROMPT;
        const prompt = await getPrompt(input);

        const content: Exclude<UserContent, "string"> = [];

        if (image) {
          const imageBuffer = await readFile(image);
          const mediaType = image.toLowerCase().endsWith(".png")
            ? "image/png"
            : "image/jpeg";

          content.push({ type: "image", mediaType, image: imageBuffer });

          console.log(
            `Using input image: ${image}: ${mediaType} ${imageBuffer.length} bytes`,
          );
        }

        content.push({ type: "text", text: prompt });

        const providerOptions = parseProviderOptions(option);
        const result = await generateText({
          system,
          model,
          prompt: [{ role: "user", content }],
          providerOptions,
        });

        // Save generated images to local filesystem
        const imageFiles = result.files.filter((f) =>
          f.mediaType?.startsWith("image/"),
        );

        if (imageFiles.length > 0) {
          // Create output directory if it doesn't exist
          const outputDir = tmpdir();

          const timestamp = Date.now();

          for (const [index, file] of imageFiles.entries()) {
            const extension = file.mediaType?.split("/")[1] || "png";
            const filename = `image-${timestamp}-${index}.${extension}`;
            const filepath = path.join(outputDir, filename);

            await writeFile(filepath, file.uint8Array);
            console.log(filepath);
          }
        } else {
          console.log("No images were generated.");
          exit(1);
        }
      },
    );

  return cmd;
}
