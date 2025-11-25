import { Command } from "commander";
import { readStdin } from "../utils/input";
import { streamText } from "ai";
import { getModel } from "../utils/models";

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
        promptString: string,
        { system, model: providerModel }: { system?: string; model: string }
      ) => {
        const shouldReadStdin = promptString === "-";
        const isPiped = !process.stdin.isTTY;
        const prompt =
          shouldReadStdin && isPiped ? await readStdin() : promptString;
        const model = getModel(providerModel);

        const { textStream } = streamText({ system, model, prompt });

        for await (const textPart of textStream) {
          process.stdout.write(textPart);
        }

        process.stdout.write("\n");
      }
    );

  return cmd;
}
