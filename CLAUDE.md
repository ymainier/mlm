# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js CLI tool inspired by Simon Willison's `llm` for interacting with various LLM providers. Uses the Vercel AI SDK with their gateway for unified access to multiple providers.

## Commands

- `pnpm dev <prompt>` - Run the CLI in development mode (default command is `prompt`)
- `pnpm test` - Run tests with Vitest (watch mode by default)
- `pnpm test run` - Run tests once without watch mode
- `pnpm typecheck` - Run TypeScript type checking

## Architecture

The CLI is built with Commander.js and uses the Vercel AI SDK Gateway (`@ai-sdk/gateway`) for multi-provider support.

**Entry flow:** `src/index.ts` → `src/cli.ts` (registers commands) → `src/commands/*.ts`

**Commands:**
- `prompt` (default) - Send a text prompt to an LLM with optional system prompt
- `cmd` - Generate shell commands from natural language descriptions
- `models` - List available models with pricing information
- `image` - Generate images using multimodal models (e.g., Gemini)
- `image-new` - Generate images using dedicated image generation models (e.g., Imagen)

**Utilities:**
- `src/utils/input.ts` - Handles stdin reading; use `-` as prompt argument to pipe input
- `src/utils/text.ts` - Wraps AI SDK's streamText for streaming responses to stdout

**Model format:** All commands use `provider/model` format (e.g., `openai/gpt-5-mini`, `google/gemini-2.5-flash-image`)
