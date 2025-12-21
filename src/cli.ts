import { program } from "commander";
import { image } from "./commands/image";
import { imageNew } from "./commands/image-new";
import { models } from "./commands/models";
import { prompt } from "./commands/prompt";

export async function cli() {
  program.addCommand(image());
  program.addCommand(imageNew());
  program.addCommand(models());
  program.addCommand(prompt(), { isDefault: true });

  await program.parseAsync();
}
