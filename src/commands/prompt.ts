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
    .action(
      async (
        inputArg: string | undefined,
        {
          system: cliSystem,
          model: cliModel,
          option: cliOption,
          attachment: cliAttachment,
          schema: cliSchema,
          template: templateName,
        }: {
          system?: string;
          model?: string;
          option: string[];
          attachment: string[];
          schema?: string;
          template?: string;
        },
      ) => {
        // Load template if specified
        let tpl: Template = {};
        if (templateName) {
          try {
            tpl = await loadTemplate(templateName);
          } catch (error) {
            if (error instanceof TemplateNotFoundError) {
              console.error(`Template not found: ${error.templateName}`);
              console.error(`Expected at: ${error.templatePath}`);
              exit(1);
            }
            if (error instanceof TemplateParseError) {
              console.error(`Invalid JSON in template: ${error.templateName}`);
              exit(1);
            }
            throw error;
          }
        }

        // Merge scalars: CLI overrides template
        const system = cliSystem ?? tpl.system;
        const model = cliModel ?? tpl.model ?? "openai/gpt-5-mini";
        const schema = cliSchema ?? tpl.schema;

        // Merge arrays: template + CLI
        const option = [...(tpl.options ?? []), ...cliOption];
        const attachment = [...(tpl.attachments ?? []), ...cliAttachment];

        // Resolve prompt
        let input = inputArg;
        if (!input && tpl.prompt) {
          input = tpl.prompt;
        }
        if (!input) {
          console.error(
            "No prompt provided. Supply a prompt argument or use a template with a prompt.",
          );
          exit(1);
        }

        const prompt = await getPrompt(input);
        const providerOptions = parseProviderOptions(option);
        const messages = await getMessages(system, prompt, attachment);

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
          console.log(object);
        } else {
          const { textStream } = streamText({
            model,
            providerOptions,
            messages,
          });
          await printTextStream(textStream);
        }
      },
    );

  return cmd;
}
