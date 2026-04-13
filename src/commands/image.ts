import { exit } from "node:process";
import { generateText, type ModelMessage, type UserContent } from "ai";
import { resolveModel } from "../utils/resolve-model";
import { Command } from "commander";
import { getAttachmentContent } from "../utils/attachments";
import { getPrompt } from "../utils/input";
import {
  attachmentOption,
  modelOption,
  outputOption,
  parseProviderOptions,
  providerOption,
} from "../utils/options";
import { save, validateOutputPaths } from "../utils/images";

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

        const messages: Array<ModelMessage> = [
          { role: "system", content: IMAGE_SYSTEM_PROMPT },
        ];
        const content: Exclude<UserContent, "string"> = [];
        for (const path of attachment) {
          content.push(await getAttachmentContent(path));
        }
        content.push({ type: "text", text: await getPrompt(input) });
        messages.push({ role: "user", content });

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
