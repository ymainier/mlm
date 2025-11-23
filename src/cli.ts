import { program } from "commander";
import { prompt } from "./commands/prompt";

export async function main() {
  program.addCommand(prompt(), { isDefault: true });

  await program.parseAsync();
}
