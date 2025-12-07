import { Command } from "commander";
import { getPrompt } from "../utils/input";
import { streamText } from "../utils/text";

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
    .option("-m, --model <provider/model>", "model to use", "openai/gpt-5-mini")
    .argument("<prompt>", "command to generate (use - for stdin)")
    .action(async (input: string, { model }: { model: string }) => {
      const system = COMMAND_SYSTEM_PROMPT;
      const prompt = await getPrompt(input);
      const onTextPart = process.stdout.write.bind(process.stdout);
      streamText({ system, model, prompt, onTextPart });
    });

  return cmd;
}
