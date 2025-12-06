import { Command } from "commander";
import { getPrompt } from "../utils/input";
import { streamText } from "../utils/text";

export function prompt() {
  const cmd = new Command("prompt");

  cmd
    .option(
      "-s, --system <system>",
      "system prompt to guide the model behavior"
    )
    .option("-m, --model <provider/model>", "model to use", "openai/gpt-5-mini")
    .argument("<prompt>", "prompt text (use - for stdin)")
    .action(
      async (
        input: string,
        { system, model }: { system?: string; model: string }
      ) => {
        const prompt = await getPrompt(input);
        const onTextPart = process.stdout.write.bind(process.stdout);
        streamText({ system, model, prompt, onTextPart });
      }
    );

  return cmd;
}
