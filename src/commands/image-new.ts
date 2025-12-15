import { exit } from "node:process";
import { experimental_generateImage as generateImage } from "ai";
import { Command } from "commander";
import { getPrompt } from "../utils/input";
import { collect, parseProviderOptions } from "../utils/options";
import { save } from "../utils/images";

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

        if (result.images.length === 0) {
          console.error("No images were generated.");
          exit(1);
        }

        const paths = await save(result.images);
        paths.forEach((p) => console.log(p));
      },
    );

  return cmd;
}
