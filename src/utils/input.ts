export async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data.trim());
    });
    process.stdin.on("error", reject);
  });
}

export async function getPrompt(input: string): Promise<string> {
  const shouldReadStdin = input === "-";
  const isPiped = !process.stdin.isTTY;
  return shouldReadStdin && isPiped ? await readStdin() : input;
}
