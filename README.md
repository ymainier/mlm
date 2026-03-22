# mlm

A CLI tool for interacting with LLMs, inspired by Simon Willison's [llm](https://github.com/simonw/llm). Uses the [Vercel AI SDK Gateway](https://sdk.vercel.ai/docs/ai-sdk-gateway) for unified access to multiple providers.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Get an API key from [Vercel AI Gateway](https://vercel.com/ai-gateway) and create a `.env` file:
   ```bash
   AI_GATEWAY_API_KEY="your-key-here"
   ```

## Usage

### prompt (default command)

Send a text prompt to an LLM:

```bash
pnpm dev "What is the capital of France?"
# Specify a model with -m/--model
pnpm dev -m anthropic/claude-3-haiku "Explain quantum computing"
# Specifiy a system prompt with -s/--system
pnpm dev -s "You are a pirate" "Tell me about the ocean"
```

Pipe input using `-`:

```bash
echo "Summarize this" | pnpm dev -
cat file.txt | pnpm dev - "What does this code do?"
```

Add fragments (text prepended to your prompt) with `-f`/`--fragment`:

```bash
pnpm dev -f README.md "Summarize this"
pnpm dev -f https://example.com/doc.txt "What does this say?"
cat context.txt | pnpm dev -f - "Answer based on the above"
# Multiple fragments are combined
pnpm dev -f part1.md -f part2.md "Compare these"
```

Add file attachments with `-a`/`--attachment`:

```bash
pnpm dev -a image.png "Describe this image"
pnpm dev -a doc1.pdf -a doc2.pdf "Compare these documents"
```

Structured output with schema DSL `-S`/`--schema`:

```bash
pnpm dev -S "name str, age int" "Generate a person"
pnpm dev -S "title str, done? bool: whether completed" "Create a todo item"
```

Schema DSL format: `fieldName type` or `fieldName? type` (optional), with optional `: description`. Types: `str`, `int`, `num`, `bool`. Mostly as described in [concise llm schema syntax](https://llm.datasette.io/en/stable/schemas.html#concise-llm-schema-syntax).

Pass provider-specific options `-o`/`--option`:

```bash
pnpm dev -o openai.reasoningEffort=low -o openai.textVerbosity=medium "Write a poem"
```

### models

List available models with pricing:

```bash
pnpm dev models
pnpm dev models -t language          # Filter by type (--type)
pnpm dev models -s input             # Sort by input price (--sort input)
pnpm dev models -o                   # Output model names only (--only-model)
```

### image

Generate images using multimodal models (e.g., Gemini):

```bash
pnpm dev image "A sunset over mountains"
# Specify model that supports image generation with -m/--model
pnpm dev image -m google/gemini-2.5-flash-image -O output.png "A cat"
# Attach a file with -a/--attachment
pnpm dev image -a sketch.png "Colorize this sketch"
```

### image-new

Generate images using dedicated image generation models (e.g., Imagen):

```bash
pnpm dev image-new "A futuristic city"
# Specify image model with -m/--model
pnpm dev image-new -m google/imagen-4.0-fast-generate-001 -O result.png "A robot"
```

## Templates

Create reusable configurations in `~/.mlm/templates/`:

```yaml
# ~/.mlm/templates/cmd.yaml
system: |
  Return only the command to be executed as a raw string, no string delimiters wrapping it, no yapping,
  no markdown, no fenced code blocks, what you return will be passed to child_process.exec directly.
  For example, if the user asks: undo last git commit You return only: git reset --soft HEAD~1",
options:
  - openai.reasoningEffort=minimal
```

Prompt from the [cmd plugin for llm](https://github.com/simonw/llm-cmd).

Use with `-t`/`--template`:

```bash
pnpm dev -t cmd "process id listening on port 3000"
```

A `default.yaml` template is automatically loaded if present.

## Model Format

All commands use `provider/model` format:

- `openai/gpt-4o`
- `anthropic/claude-3-5-sonnet`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-image`
- `google/imagen-4.0-fast-generate-001`

Run `pnpm dev models` to see all available models.
