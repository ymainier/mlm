import { program } from "commander";
import { models } from "./commands/models";
import { prompt } from "./commands/prompt";
import { cmd } from "./commands/cmd";

export async function main() {
  program.addCommand(cmd());
  program.addCommand(models());
  program.addCommand(prompt(), { isDefault: true });

  await program.parseAsync();
}
