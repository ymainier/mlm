import { Command } from "commander";
import { exit } from "node:process";
import { getPrompt, readStdin } from "../utils/input.ts";
import { resolveFragments } from "../utils/fragments.ts";
import {
  attachmentOption,
  fragmentOption,
  modelOption,
  parseProviderOptions,
  providerOption,
} from "../utils/options.ts";
import { getMessages } from "../utils/get-messages.ts";
import { streamText, generateObject, jsonSchema } from "ai";
import { resolveModel } from "../utils/resolve-model.ts";
import { printTextStream } from "../utils/print-text-stream.ts";
import { parseConciseJsonSchemaDsl } from "../utils/parse-concise-json-schema-dsl.ts";
import {
  loadTemplate,
  TemplateNotFoundError,
  TemplateParseError,
  type Template,
} from "../utils/template.ts";

type PromptOptions = {
  system?: string;
  model?: string;
  option: string[];
  attachment: string[];
  fragment: string[];
  schema?: string;
  template?: string;
};

async function getTemplate(
  templateName: string | undefined,
): Promise<Template> {
  const nameToLoad = templateName ?? "default";
  const isDefault = templateName === undefined;

  try {
    return await loadTemplate(nameToLoad);
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      if (isDefault) {
        return {}; // Default template not found, that's OK
      }
      console.error(`Template ${error.templatePath} not found`);
      exit(1);
    }
    if (error instanceof TemplateParseError) {
      console.error(`Invalid YAML in template: ${error.templateName}`);
      exit(1);
    }
    throw error;
  }
}

type MergedCliOptionsWithTemplate = Template & { model: string };

async function mergeCliOptionsWithTemplate(
  inputArg: string | undefined,
  options: PromptOptions,
): Promise<MergedCliOptionsWithTemplate> {
  const template = await getTemplate(options.template);

  return {
    system: options.system ?? template.system,
    model: options.model ?? template.model ?? "openai/gpt-5-mini",
    schema: options.schema ?? template.schema,
    prompt: inputArg ?? template.prompt,
    options: [...(template.options ?? []), ...options.option],
    attachments: [...(template.attachments ?? []), ...options.attachment],
  };
}

export function prompt() {
  const cmd = new Command("prompt");

  cmd
    .description("Send a text prompt to an LLM")
    .option(
      "-s, --system <system>",
      "system prompt to guide the model behavior",
    )
    .addOption(modelOption())
    .addOption(providerOption())
    .addOption(attachmentOption())
    .addOption(fragmentOption())
    .option("-S, --schema <schema>", "JSON schema DSL for structured output")
    .option("-t, --template <name>", "template name to use")
    .argument("[prompt]", "prompt text (use - for stdin)")
    .action(async (inputArg: string | undefined, cliOptions: PromptOptions) => {
      const params = await mergeCliOptionsWithTemplate(inputArg, cliOptions);
      const { attachments, model, system, options, schema } = params;
      if (!params.prompt) {
        console.error(
          "No prompt provided. Supply a prompt argument or use a template with a prompt.",
        );
        exit(1);
      }

      const needsStdin =
        params.prompt === "-" || cliOptions.fragment.includes("-");
      const stdinContent =
        needsStdin && !process.stdin.isTTY ? await readStdin() : undefined;

      const prompt = await getPrompt(params.prompt, stdinContent);
      const providerOptions = parseProviderOptions(options ?? []);
      const fragmentsText = await resolveFragments(
        cliOptions.fragment,
        stdinContent,
      );
      const messages = await getMessages(
        system,
        prompt,
        attachments,
        fragmentsText,
      );
      const parsedSchema = schema
        ? parseConciseJsonSchemaDsl(schema)
        : undefined;

      const resolvedModel = resolveModel(model);
      if (parsedSchema) {
        const { object } = await generateObject({
          model: resolvedModel,
          providerOptions,
          messages,
          schema: jsonSchema(parsedSchema),
        });
        console.log(JSON.stringify(object, null, 2));
      } else {
        const { textStream } = streamText({
          model: resolvedModel,
          providerOptions,
          messages,
        });
        await printTextStream(textStream);
      }
    });

  return cmd;
}
