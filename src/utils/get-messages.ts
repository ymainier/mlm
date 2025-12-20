import type { ModelMessage, UserContent } from "ai";
import { getAttachmentContent } from "./attachments";

export async function getMessages(
  system: string | undefined,
  prompt: string,
  attachments: string[] = [],
) {
  const messages: Array<ModelMessage> = [];

  if (system) {
    messages.push({ role: "system", content: system });
  }

  const content: Exclude<UserContent, string> = [];
  for (const path of attachments) {
    content.push(await getAttachmentContent(path));
  }
  content.push({ type: "text", text: prompt });
  messages.push({ role: "user", content });
  return messages;
}
