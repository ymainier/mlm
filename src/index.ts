#! /usr/bin/env tsx
import { config } from "dotenv";
import { join } from "path";

config({ path: join(import.meta.dirname, "..", ".env"), quiet: true });
import { cli } from "./cli";

try {
  await cli();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
