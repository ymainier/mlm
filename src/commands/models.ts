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

export function models() {
  const cmd = new Command("models");

  cmd
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
    .option("-o, --only-model", "only display model names")
    .action(
      async ({
        type,
        sort,
        onlyModel,
      }: {
        type: string;
        sort: string;
        onlyModel: boolean;
      }) => {
        const modelType = MODEL_TYPES.includes(
          type.toLowerCase() as (typeof MODEL_TYPES)[number],
        )
          ? type.toLowerCase()
          : undefined;
        const sortKey = SORT_KEYS.includes(
          sort.toLowerCase() as (typeof SORT_KEYS)[number],
        )
          ? sort.toLowerCase()
          : "model";
        const availableModels = await gateway.getAvailableModels();

        const data = availableModels.models
          .filter(
            (m) =>
              typeof modelType === "undefined" || m.modelType === modelType,
          )
          .map(
            (model) =>
              [
                model.id,
                model.modelType ?? "unknown",
                parseFloat(model.pricing?.input ?? "0") * 1_000_000,
                parseFloat(model.pricing?.output ?? "0") * 1_000_000,
              ] as [string, string, number, number],
          )
          .sort((a, b) => {
            if (sortKey === "input") {
              const comparison = a[2] - b[2];
              return comparison !== 0 ? comparison : a[3] - b[3];
            } else if (sortKey === "output") {
              const comparison = a[3] - b[3];
              return comparison !== 0 ? comparison : a[2] - b[2];
            }
            return a[0].localeCompare(b[0]);
          });

        if (onlyModel) {
          data.forEach(([modelId]) => console.log(modelId));
        } else {
          const formatted = data.map(([a, b, c, d]) => [
            a,
            b,
            toPrice(c),
            toPrice(d),
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
