import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const { textStream } = streamText({
  model: openai("gpt-5-mini"),
  prompt: "Write a short poem about embedding models.",
});

for await (const textPart of textStream) {
  process.stdout.write(textPart);
}

console.log();
