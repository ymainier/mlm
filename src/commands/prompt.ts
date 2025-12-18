import { Command } from "commander";
import { getPrompt } from "../utils/input";
import { collect, parseProviderOptions } from "../utils/options";
import { streamText } from "../utils/text";

export function prompt() {
  const cmd = new Command("prompt");

  cmd
    .description("Send a text prompt to an LLM")
    .option(
      "-s, --system <system>",
      "system prompt to guide the model behavior",
    )
    .option("-m, --model <provider/model>", "model to use", "openai/gpt-5-mini")
    .option(
      "-o, --option <provider.key=value>",
      "provider option (repeatable)",
      collect,
      [],
    )
    .option(
      "-a, --attachment <path>",
      "file attachment (repeatable)",
      collect,
      [],
    )
    .argument("<prompt>", "prompt text (use - for stdin)")
    .action(
      async (
        input: string,
        {
          system,
          model,
          option,
          attachment,
        }: {
          system?: string;
          model: string;
          option: string[];
          attachment: string[];
        },
      ) => {
        const prompt = await getPrompt(input);
        const providerOptions = parseProviderOptions(option);
        const onTextPart = process.stdout.write.bind(process.stdout);
        streamText({
          system,
          model,
          prompt,
          attachments: attachment,
          providerOptions,
          onTextPart,
        });
      },
    );

  return cmd;
}
