import { streamText as _streamText } from "ai";
import { on } from "events";

type StreamTextOptions = {
  system?: string;
  model: string;
  prompt: string;
  onTextPart: (textPart: string) => void;
};

export async function streamText({
  system,
  model,
  prompt,
  onTextPart,
}: StreamTextOptions) {
  const { textStream } = _streamText({ system, model, prompt });

  for await (const textPart of textStream) {
    onTextPart(textPart);
  }
  onTextPart("\n");
}
