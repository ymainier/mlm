import { Command } from "commander";
import { exit } from "node:process";
import { getPrompt } from "../utils/input";
import { collect, parseProviderOptions } from "../utils/options";
import { getMessages } from "../utils/get-messages";
import { streamText, generateObject, jsonSchema } from "ai";
import { printTextStream } from "../utils/print-text-stream";
import { parseConciseJsonSchemaDsl } from "../utils/parse-concise-json-schema-dsl";
import {
  loadTemplate,
  TemplateNotFoundError,
  TemplateParseError,
  type Template,
} from "../utils/template";

type PromptOptions = {
  system?: string;
  model?: string;
  option: string[];
  attachment: string[];
  schema?: string;
  template?: string;
};

async function getTemplate(
  templateName: string | undefined,
): Promise<Template> {
  if (!templateName) return {};

  try {
    return loadTemplate(templateName);
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      console.error(`Template ${error.templatePath} not found`);
      exit(1);
    }
    if (error instanceof TemplateParseError) {
      console.error(`Invalid JSON in template: ${error.templateName}`);
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
    .option("-m, --model <provider/model>", "model to use")
    .option(
      "-o, --option <provider.key=value>",
      "provider option (repeatable)",
      collect,
      [],
    )
    .option(
      "-a, --attachment <path>",
      "file attachment (repeatable)",
      collect,
      [],
    )
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

      const prompt = await getPrompt(params.prompt);
      const providerOptions = parseProviderOptions(options ?? []);
      const messages = await getMessages(system, prompt, attachments);
      const parsedSchema = schema
        ? parseConciseJsonSchemaDsl(schema)
        : undefined;

      if (parsedSchema) {
        const { object } = await generateObject({
          model,
          providerOptions,
          messages,
          schema: jsonSchema(parsedSchema),
        });
        console.log(JSON.stringify(object, null, 2));
      } else {
        const { textStream } = streamText({
          model,
          providerOptions,
          messages,
        });
        await printTextStream(textStream);
      }
    });

  return cmd;
}
