import { Command } from "commander";
import { getPrompt } from "../utils/input";
import { collect, parseProviderOptions } from "../utils/options";
import { getMessages } from "../utils/get-messages";
import { streamText } from "ai";
import { printTextStream } from "../utils/print-text-stream";

const COMMAND_SYSTEM_PROMPT = `
Return only the command to be executed as a raw string, no string delimiters
wrapping it, no yapping, no markdown, no fenced code blocks, what you return
will be passed to subprocess.check_output() directly.
For example, if the user asks: undo last git commit
You return only: git reset --soft HEAD~1
`.trim();

export function cmd() {
  const cmd = new Command("cmd");

  cmd
    .description("Generate shell commands from natural language descriptions")
    .option("-m, --model <provider/model>", "model to use", "openai/gpt-5-mini")
    .option(
      "-o, --option <provider.key=value>",
      "provider option (repeatable)",
      collect,
      [],
    )
    .argument("<prompt>", "command to generate (use - for stdin)")
    .action(
      async (
        input: string,
        { model, option }: { model: string; option: string[] },
      ) => {
        const system = COMMAND_SYSTEM_PROMPT;
        const prompt = await getPrompt(input);
        const providerOptions = parseProviderOptions(option);
        const messages = await getMessages(system, prompt);

        const { textStream } = streamText({ model, providerOptions, messages });

        await printTextStream(textStream);
      },
    );

  return cmd;
}
