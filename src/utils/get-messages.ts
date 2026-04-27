import type { ModelMessage, UserContent } from "ai";
import { getAttachmentContent } from "./attachments.ts";

export async function getMessages(
  system: string | undefined,
  prompt: string,
  attachments: string[] = [],
  fragmentsText?: string,
) {
  const messages: Array<ModelMessage> = [];

  if (system) {
    messages.push({ role: "system", content: system });
  }

  const attachmentContents = await Promise.all(
    attachments.map((p) => getAttachmentContent(p)),
  );
  const content: Exclude<UserContent, string> = [...attachmentContents];
  const userText = fragmentsText ? `${fragmentsText}\n\n${prompt}` : prompt;
  content.push({ type: "text", text: userText });
  messages.push({ role: "user", content });
  return messages;
}
