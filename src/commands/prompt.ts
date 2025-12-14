import { Command } from "commander";
import { getPrompt } from "../utils/input";
import { collect, parseProviderOptions } from "../utils/options";
import { streamText } from "../utils/text";

export function prompt() {
  const cmd = new Command("prompt");

  cmd
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
    .argument("<prompt>", "prompt text (use - for stdin)")
    .action(
      async (
        input: string,
        {
          system,
          model,
          option,
        }: { system?: string; model: string; option: string[] },
      ) => {
        const prompt = await getPrompt(input);
        const providerOptions = parseProviderOptions(option);
        const onTextPart = process.stdout.write.bind(process.stdout);
        streamText({ system, model, prompt, providerOptions, onTextPart });
      },
    );

  return cmd;
}
