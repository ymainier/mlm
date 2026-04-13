import { ollama } from "ollama-ai-provider-v2";
import type { LanguageModel } from "ai";

const OLLAMA_PREFIX = "ollama/";

export function resolveModel(modelId: string): LanguageModel | string {
  if (modelId.startsWith(OLLAMA_PREFIX)) {
    return ollama(modelId.slice(OLLAMA_PREFIX.length));
  }
  return modelId;
}
