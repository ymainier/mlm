import { streamText as _streamText, type UserContent } from "ai";
import { getAttachmentContent } from "./attachments";
import type { ProviderOptions } from "./options";

type StreamTextOptions = {
  system?: string;
  model: string;
  prompt: string;
  attachments?: string[];
  providerOptions?: ProviderOptions;
  onTextPart: (textPart: string) => void;
};

export async function streamText({
  system,
  model,
  prompt,
  attachments = [],
  providerOptions = {},
  onTextPart,
}: StreamTextOptions) {
  const content: Exclude<UserContent, string> = [];

  for (const path of attachments) {
    content.push(await getAttachmentContent(path));
  }

  content.push({ type: "text", text: prompt });

  const { textStream } = _streamText({
    system,
    model,
    providerOptions,
    prompt: [{ role: "user", content }],
  });

  for await (const textPart of textStream) {
    onTextPart(textPart);
  }
  onTextPart("\n");
}
