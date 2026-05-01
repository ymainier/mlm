import { program } from "commander";
import { conversations } from "./commands/conversations.ts";
import { image } from "./commands/image.ts";
import { imageNew } from "./commands/image-new.ts";
import { models } from "./commands/models.ts";
import { prompt } from "./commands/prompt.ts";

export async function cli() {
  program.addCommand(conversations());
  program.addCommand(image());
  program.addCommand(imageNew());
  program.addCommand(models());
  program.addCommand(prompt(), { isDefault: true });

  await program.parseAsync();
}
