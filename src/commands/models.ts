import { gateway } from "@ai-sdk/gateway";
import { Command } from "commander";
import { getBorderCharacters, table } from "table";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toPrice = formatter.format.bind(formatter);

const MODEL_TYPES = ["language", "embedding", "image"] as const;
const SORT_KEYS = ["model", "input", "output"] as const;
const PROVIDERS = ["gateway", "openrouter"] as const;

function pickValid<T extends string, F extends T | undefined>(
  value: string,
  allowed: readonly T[],
  fallback: F,
): T | F {
  const lower = value.toLowerCase() as T;
  return allowed.includes(lower) ? lower : fallback;
}

const toPricePerMillion = (s: string | undefined) =>
  parseFloat(s ?? "0") * 1_000_000;

interface ModelRow {
  id: string;
  type: string;
  inputPrice: number;
  outputPrice: number;
}

async function getGatewayRows(): Promise<ModelRow[]> {
  const availableModels = await gateway.getAvailableModels();
  return availableModels.models.map((model) => ({
    id: model.id,
    type: model.modelType ?? "unknown",
    inputPrice: toPricePerMillion(model.pricing?.input),
    outputPrice: toPricePerMillion(model.pricing?.output),
  }));
}

interface OpenRouterModel {
  id: string;
  pricing?: { prompt?: string; completion?: string };
}

async function getOpenRouterRows(): Promise<ModelRow[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models");
  if (!response.ok) {
    throw new Error(
      `OpenRouter models request failed: ${response.status} ${response.statusText}`,
    );
  }
  const payload = (await response.json()) as { data: OpenRouterModel[] };
  return payload.data.map((model) => ({
    id: `openrouter:${model.id}`,
    type: "language",
    inputPrice: toPricePerMillion(model.pricing?.prompt),
    outputPrice: toPricePerMillion(model.pricing?.completion),
  }));
}

export function models() {
  const cmd = new Command("models");

  cmd
    .description("List available models with pricing information")
    .option(
      "-t, --type [modelType]",
      "filter by model type (all, language, embedding or image)",
      "all",
    )
    .option(
      "-s, --sort [sortBy]",
      'sort by "model", "input" price or "output" price',
      "model",
    )
    .option(
      "-p, --provider [provider]",
      'source provider ("gateway" or "openrouter")',
      "gateway",
    )
    .option("-o, --only-model", "only display model names")
    .action(
      async ({
        type,
        sort,
        provider,
        onlyModel,
      }: {
        type: string;
        sort: string;
        provider: string;
        onlyModel: boolean;
      }) => {
        const modelType = pickValid(type, MODEL_TYPES, undefined);
        const sortKey = pickValid(sort, SORT_KEYS, "model" as const);
        const providerKey = pickValid(provider, PROVIDERS, "gateway" as const);

        const rows =
          providerKey === "openrouter"
            ? await getOpenRouterRows()
            : await getGatewayRows();

        const data = rows
          .filter((row) => modelType === undefined || row.type === modelType)
          .sort((a, b) => {
            if (sortKey === "input") {
              const comparison = a.inputPrice - b.inputPrice;
              return comparison !== 0
                ? comparison
                : a.outputPrice - b.outputPrice;
            } else if (sortKey === "output") {
              const comparison = a.outputPrice - b.outputPrice;
              return comparison !== 0
                ? comparison
                : a.inputPrice - b.inputPrice;
            }
            return a.id.localeCompare(b.id);
          });

        if (onlyModel) {
          data.forEach((row) => console.log(row.id));
        } else {
          const formatted = data.map((row) => [
            row.id,
            row.type,
            toPrice(row.inputPrice),
            toPrice(row.outputPrice),
          ]);
          const output = table(formatted, {
            border: getBorderCharacters("void"),
            drawHorizontalLine: () => false,
          });
          console.log(output);
        }
      },
    );

  return cmd;
}
