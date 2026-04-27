import { exit } from "node:process";
import { generateText } from "ai";
import { resolveModel } from "../utils/resolve-model.ts";
import { Command } from "commander";
import { getPrompt } from "../utils/input.ts";
import { getMessages } from "../utils/get-messages.ts";
import {
  attachmentOption,
  modelOption,
  outputOption,
  parseProviderOptions,
  providerOption,
} from "../utils/options.ts";
import { save, validateOutputPaths } from "../utils/images.ts";

const IMAGE_SYSTEM_PROMPT = `
You are an AI model specialized in generating images based on textual descriptions.
Generate high-quality images that accurately reflect the details and nuances of the provided prompts.
`.trim();

export function image() {
  const cmd = new Command("image");

  cmd
    .description("Generate images using multimodal models")
    .addOption(modelOption("google/gemini-3.1-flash-image-preview"))
    .addOption(attachmentOption())
    .addOption(providerOption())
    .addOption(outputOption())
    .argument("<prompt>", "description of the image (use - for stdin)")
    .action(
      async (
        input: string,
        {
          model,
          attachment,
          option,
          output,
        }: {
          model: string;
          attachment: string[];
          option: string[];
          output: string[];
        },
      ) => {
        try {
          await validateOutputPaths(output);
        } catch (err) {
          console.error((err as Error).message);
          exit(1);
        }

        const prompt = await getPrompt(input);
        const messages = await getMessages(
          IMAGE_SYSTEM_PROMPT,
          prompt,
          attachment,
        );

        const providerOptions = parseProviderOptions(option);
        const result = await generateText({
          model: resolveModel(model),
          messages,
          providerOptions,
        });

        const images = result.files.filter((f) =>
          f.mediaType?.startsWith("image/"),
        );

        if (images.length === 0) {
          console.error("No images were generated.");
          exit(1);
        }

        const paths = await save(images, output);
        paths.forEach((p) => console.log(p));
      },
    );

  return cmd;
}
