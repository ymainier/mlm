#! /usr/bin/env tsx
import "dotenv/config";
import { cli } from "./cli";

try {
  await cli();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
