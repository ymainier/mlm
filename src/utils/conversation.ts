import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ModelMessage } from "ai";

export interface Conversation {
  id: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<ModelMessage>;
}

export function getConversationsDir(): string {
  return join(homedir(), ".mlm", "conversations");
}

function getConversationPath(id: string): string {
  return join(getConversationsDir(), `${id}.json`);
}

export async function saveConversation(
  conversation: Conversation,
): Promise<void> {
  const dir = getConversationsDir();
  await mkdir(dir, { recursive: true });
  const path = getConversationPath(conversation.id);
  await writeFile(path, JSON.stringify(conversation, null, 2), "utf-8");
}

export async function loadConversation(id: string): Promise<Conversation> {
  const path = getConversationPath(id);
  const content = await readFile(path, "utf-8");
  return JSON.parse(content) as Conversation;
}

export async function listConversations(): Promise<Conversation[]> {
  const dir = getConversationsDir();
  let files: string[];
  try {
    files = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const conversations = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const content = await readFile(join(dir, f), "utf-8");
        return JSON.parse(content) as Conversation;
      }),
  );

  return conversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getLatestConversation(): Promise<
  Conversation | undefined
> {
  const conversations = await listConversations();
  return conversations[0];
}

export function createConversation(
  model: string,
  messages: Array<ModelMessage>,
): Conversation {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    model,
    createdAt: now,
    updatedAt: now,
    messages,
  };
}
