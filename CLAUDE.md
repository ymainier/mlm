# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js CLI tool inspired by Simon Willison's `llm` for interacting with various LLM providers. Uses the Vercel AI SDK with their gateway for unified access to multiple providers.

## Commands

- `pnpm dev <prompt>` - Run the CLI in development mode (default command is `prompt`)
- `pnpm test` - Run tests with Vitest (watch mode by default)
- `pnpm test run` - Run tests once without watch mode
- `pnpm test run src/path/to/file.test.ts` - Run a single test file
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` - Run linting
- `pnpm format` - Run formatting

## Architecture

The CLI is built with Commander.js and uses the Vercel AI SDK Gateway (`@ai-sdk/gateway`) for multi-provider support.

**Entry flow:** `src/index.ts` → `src/cli.ts` (registers commands) → `src/commands/*.ts`

**CLI Commands:**

- `prompt` (default) - Send a text prompt to an LLM with optional system prompt, attachments, and structured output schema
- `models` - List available models with pricing information
- `image` - Generate images using multimodal models (e.g., Gemini)
- `image-new` - Generate images using dedicated image generation models (e.g., Imagen)

**Key Utilities:**

- `src/utils/options.ts` - Shared Commander options (`-m/--model`, `-o/--option`, `-a/--attachment`, `-O/--output`)
- `src/utils/template.ts` - Template loading from `~/.mlm/templates/*.yaml`
- `src/utils/input.ts` - Handles stdin reading; use `-` as prompt argument to pipe input
- `src/utils/get-messages.ts` - Builds AI SDK messages from system prompt, user prompt, and attachments

**Model format:** All commands use `provider/model` format (e.g., `openai/gpt-5-mini`, `google/gemini-2.5-flash-image`)

**Templates:** YAML files in `~/.mlm/templates/` that can preset system prompts, models, options, attachments, and schemas. A `default.yaml` template is auto-loaded if present.
