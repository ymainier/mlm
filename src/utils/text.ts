import {
  streamText as _streamText,
  type ModelMessage,
  type UserContent,
} from "ai";
import { getAttachmentContent } from "./attachments";
import type { ProviderOptions } from "./options";

type StreamTextOptions = {
  system?: string;
  model: string;
  prompt: string;
  attachments?: string[];
  providerOptions?: ProviderOptions;
  onTextPart: (textPart: string) => void;
  conversationId?: string;
};

export async function streamText({
  system,
  model,
  prompt,
  attachments = [],
  providerOptions = {},
  onTextPart,
}: StreamTextOptions) {
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

  const { textStream } = _streamText({
    model,
    providerOptions,
    messages,
  });

  for await (const textPart of textStream) {
    onTextPart(textPart);
  }
  onTextPart("\n");
}
