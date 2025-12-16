import { readFile } from "node:fs/promises";
import { streamText as _streamText, type UserContent } from "ai";
import { fileTypeFromBuffer } from "file-type";
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
    const data = await readFile(path);
    const fileType = await fileTypeFromBuffer(data);
    const mediaType = fileType?.mime ?? "application/octet-stream";

    if (mediaType.startsWith("image/")) {
      content.push({ type: "image", mediaType, image: data });
    } else {
      content.push({ type: "file", mediaType, data });
    }
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
