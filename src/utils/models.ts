import { openai } from "@ai-sdk/openai";
import { openrouter } from '@openrouter/ai-sdk-provider';

export function getModel(providerModel: string) {
  const [provider, ...modelParts] = providerModel.split("/");
  const model = modelParts.join("/");
  if (
    typeof provider === "undefined" ||
    provider.length <= 0 ||
    typeof model === "undefined" ||
    model.length <= 0
  ) {
    throw new Error(
      `Invalid model format: ${providerModel}. Expected format: <provider>/<model>`
    );
  }
  switch (provider) {
    case "openai":
      return openai(model);
    case "openrouter":
      return openrouter(model);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
