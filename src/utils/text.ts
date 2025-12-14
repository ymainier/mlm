import { streamText as _streamText } from "ai";
import type { ProviderOptions } from "./options";

type StreamTextOptions = {
  system?: string;
  model: string;
  prompt: string;
  providerOptions?: ProviderOptions;
  onTextPart: (textPart: string) => void;
};

export async function streamText({
  system,
  model,
  prompt,
  providerOptions = {},
  onTextPart,
}: StreamTextOptions) {
  const { textStream } = _streamText({ system, model, providerOptions, prompt });

  for await (const textPart of textStream) {
    onTextPart(textPart);
  }
  onTextPart("\n");
}
