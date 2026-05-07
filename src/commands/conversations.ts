import { Command } from "commander";
import { listConversations, type Conversation } from "../utils/conversation.ts";
import { getBorderCharacters, table } from "table";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

function getTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: { type: string; text?: string; toolName?: string }) => {
      if (part.type === "text") return part.text ?? "";
      if (part.type === "image") return "[image attachment]";
      if (part.type === "tool-call") return `[tool call: ${part.toolName}]`;
      if (part.type === "tool-result") return `[tool result: ${part.toolName}]`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function getFirstUserPrompt(
  messages: Array<{ role: string; content: unknown }>,
): string {
  const userMsg = messages.find((m) => m.role === "user");
  if (!userMsg) return "";
  return getTextContent(userMsg.content);
}

function countRounds(messages: Array<{ role: string }>): number {
  return messages.filter((m) => m.role === "user").length;
}

async function listAction({ limit }: { limit: string }) {
  const all = await listConversations();
  const shown = all.slice(0, parseInt(limit, 10));

  if (shown.length === 0) {
    console.log("No conversations found.");
    return;
  }

  const rows = shown.map((c) => [
    c.id.slice(0, 8),
    String(countRounds(c.messages)),
    truncate(getFirstUserPrompt(c.messages), 40),
    new Date(c.updatedAt).toLocaleString(),
  ]);

  const output = table([["ID", "Rounds", "Prompt", "Updated"], ...rows], {
    border: getBorderCharacters("void"),
    drawHorizontalLine: (index) => index === 1,
  });
  console.log(output);
}

function formatConversation(conversation: Conversation): string {
  const lines: string[] = [
    "---",
    `id: ${conversation.id}`,
    `created: ${conversation.createdAt}`,
    `updated: ${conversation.updatedAt}`,
    `model: ${conversation.model}`,
    "---",
  ];

  for (const msg of conversation.messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;

    lines.push("");

    if (msg.role === "user") {
      lines.push("\x1b[1m> You:\x1b[0m");
    } else {
      lines.push("\x1b[2m> Assistant:\x1b[0m");
    }

    const text = getTextContent(msg.content);
    if (text) lines.push(text);
  }

  return lines.join("\n");
}

async function findConversationByPrefix(
  prefix: string,
): Promise<Conversation | undefined> {
  const all = await listConversations();
  const matches = all.filter((c) => c.id.startsWith(prefix));

  if (matches.length === 0) {
    console.error(`No conversation found matching prefix "${prefix}".`);
    return undefined;
  }

  if (matches.length > 1) {
    console.error(`Ambiguous prefix "${prefix}". Matches:`);
    for (const m of matches) {
      console.error(`  ${m.id.slice(0, 8)}  ${m.id}`);
    }
    return undefined;
  }

  return matches[0];
}

async function showAction(id: string) {
  const conversation = await findConversationByPrefix(id);
  if (!conversation) return;

  console.log(formatConversation(conversation));
}

export function conversations() {
  const cmd = new Command("conversations");
  cmd.description("Manage saved conversations");

  cmd
    .command("list", { isDefault: true })
    .description("List saved conversations")
    .option("-n, --limit <number>", "number of conversations to show", "10")
    .action(listAction);

  cmd
    .command("show")
    .description("Show a conversation")
    .argument("<id>", "conversation ID or prefix")
    .action(showAction);

  return cmd;
}
