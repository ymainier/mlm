import { main } from "./cli";

try {
  await main();
} catch (error) {
  console.error(String(error));
  process.exit(1);
}
