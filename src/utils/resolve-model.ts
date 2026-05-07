import { ollama } from "ollama-ai-provider-v2";
import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

const OLLAMA_PREFIX = "ollama/";
const OPENROUTER_PREFIX = "openrouter:";

let openrouterProvider: OpenRouterProvider | undefined;
let openrouterApiKey: string | undefined;

function getOpenRouter(apiKey: string): OpenRouterProvider {
  if (!openrouterProvider || openrouterApiKey !== apiKey) {
    openrouterProvider = createOpenRouter({ apiKey });
    openrouterApiKey = apiKey;
  }
  return openrouterProvider;
}

export function resolveModel(modelId: string): LanguageModel | string {
  if (modelId.startsWith(OLLAMA_PREFIX)) {
    return ollama(modelId.slice(OLLAMA_PREFIX.length));
  }
  if (modelId.startsWith(OPENROUTER_PREFIX)) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY environment variable is not set. Set it to use openrouter: models.",
      );
    }
    return getOpenRouter(apiKey)(modelId.slice(OPENROUTER_PREFIX.length));
  }
  return modelId;
}
