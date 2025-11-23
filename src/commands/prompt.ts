import { Command } from "commander";
import { readStdin } from "../utils/input";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

function getModel() {
  return openai("gpt-5-nano");
}

export function prompt() {
  const cmd = new Command("prompt");

  cmd
    .argument("<prompt>", "prompt text (use - for stdin)")
    .action(async (promptString: string) => {
      const shouldReadStdin = promptString === "-";
      const isPiped = !process.stdin.isTTY;
      const prompt = shouldReadStdin && isPiped ? await readStdin() : promptString;
      const model = getModel();

      const { textStream } = streamText({ model, prompt });

      for await (const textPart of textStream) {
        process.stdout.write(textPart);
      }

      console.log();
    });

  return cmd;
}
