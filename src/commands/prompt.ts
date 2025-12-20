import { Command } from "commander";
import { getPrompt } from "../utils/input";
import { collect, parseProviderOptions } from "../utils/options";
import { getMessages } from "../utils/get-messages";
import { streamText } from "ai";
import { printTextStream } from "../utils/print-text-stream";

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
        const messages = await getMessages(system, prompt, attachment);

        const { textStream } = streamText({ model, providerOptions, messages });

        await printTextStream(textStream);
      },
    );

  return cmd;
}
