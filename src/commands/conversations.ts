import { Command } from "commander";
import { listConversations } from "../utils/conversation.ts";
import { getBorderCharacters, table } from "table";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

function getFirstUserPrompt(
  messages: Array<{ role: string; content: unknown }>,
): string {
  const userMsg = messages.find((m) => m.role === "user");
  if (!userMsg) return "";

  if (typeof userMsg.content === "string") return userMsg.content;
  if (Array.isArray(userMsg.content)) {
    const textPart = userMsg.content.find(
      (p: { type: string }) => p.type === "text",
    );
    return textPart?.text ?? "";
  }
  return "";
}

export function conversations() {
  const cmd = new Command("conversations");

  cmd
    .description("List saved conversations")
    .option("-n, --limit <number>", "number of conversations to show", "10")
    .action(async ({ limit }: { limit: string }) => {
      const all = await listConversations();
      const shown = all.slice(0, parseInt(limit, 10));

      if (shown.length === 0) {
        console.log("No conversations found.");
        return;
      }

      const rows = shown.map((c) => [
        c.id,
        c.model,
        truncate(getFirstUserPrompt(c.messages), 40),
        new Date(c.updatedAt).toLocaleString(),
      ]);

      const output = table([["ID", "Model", "Prompt", "Updated"], ...rows], {
        border: getBorderCharacters("void"),
        drawHorizontalLine: (index) => index === 1,
      });
      console.log(output);
    });

  return cmd;
}
