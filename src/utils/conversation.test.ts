import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ModelMessage } from "ai";

const { mockReadFile, mockWriteFile, mockReaddir, mockMkdir } = vi.hoisted(
  () => ({
    mockReadFile: vi.fn(),
    mockWriteFile: vi.fn(),
    mockReaddir: vi.fn(),
    mockMkdir: vi.fn(),
  }),
);

vi.mock("node:fs/promises", () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  readdir: mockReaddir,
  mkdir: mockMkdir,
}));

const mockRandomUUID = vi.hoisted(() => vi.fn());
vi.mock("node:crypto", () => ({
  randomUUID: mockRandomUUID,
}));

import {
  saveConversation,
  loadConversation,
  listConversations,
  getLatestConversation,
  createConversation,
  getConversationsDir,
  type Conversation,
} from "./conversation.ts";
import { homedir } from "node:os";
import { join } from "node:path";

const conversationsDir = join(homedir(), ".mlm", "conversations");

describe("getConversationsDir", () => {
  it("should return the conversations directory path", () => {
    expect(getConversationsDir()).toBe(conversationsDir);
  });
});

describe("createConversation", () => {
  it("should create a conversation with a UUID, model, and messages", () => {
    mockRandomUUID.mockReturnValue("test-uuid-1234");
    const messages: ModelMessage[] = [
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ];

    const conversation = createConversation("openai/gpt-5-mini", messages);

    expect(conversation.id).toBe("test-uuid-1234");
    expect(conversation.model).toBe("openai/gpt-5-mini");
    expect(conversation.messages).toBe(messages);
    expect(conversation.createdAt).toBeDefined();
    expect(conversation.updatedAt).toBe(conversation.createdAt);
  });
});

describe("saveConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("should create the directory and write the conversation file", async () => {
    const conversation: Conversation = {
      id: "abc-123",
      model: "openai/gpt-5-mini",
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: "2026-04-30T10:00:00.000Z",
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
    };

    await saveConversation(conversation);

    expect(mockMkdir).toHaveBeenCalledWith(conversationsDir, {
      recursive: true,
    });
    expect(mockWriteFile).toHaveBeenCalledWith(
      join(conversationsDir, "abc-123.json"),
      JSON.stringify(conversation, null, 2),
      "utf-8",
    );
  });
});

describe("loadConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should read and parse a conversation file", async () => {
    const conversation: Conversation = {
      id: "abc-123",
      model: "openai/gpt-5-mini",
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: "2026-04-30T10:00:00.000Z",
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
    };
    mockReadFile.mockResolvedValue(JSON.stringify(conversation));

    const result = await loadConversation("abc-123");

    expect(mockReadFile).toHaveBeenCalledWith(
      join(conversationsDir, "abc-123.json"),
      "utf-8",
    );
    expect(result).toEqual(conversation);
  });

  it("should throw when conversation file does not exist", async () => {
    mockReadFile.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    await expect(loadConversation("nonexistent")).rejects.toThrow();
  });
});

describe("listConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return conversations sorted by updatedAt descending", async () => {
    const older: Conversation = {
      id: "old",
      model: "openai/gpt-5-mini",
      createdAt: "2026-04-29T10:00:00.000Z",
      updatedAt: "2026-04-29T10:00:00.000Z",
      messages: [],
    };
    const newer: Conversation = {
      id: "new",
      model: "openai/gpt-5-mini",
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: "2026-04-30T10:00:00.000Z",
      messages: [],
    };

    mockReaddir.mockResolvedValue(["old.json", "new.json"]);
    mockReadFile.mockImplementation(async (path: string) => {
      if (path.includes("old.json")) return JSON.stringify(older);
      if (path.includes("new.json")) return JSON.stringify(newer);
      throw new Error("unexpected path");
    });

    const result = await listConversations();

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("new");
    expect(result[1]!.id).toBe("old");
  });

  it("should return empty array when directory does not exist", async () => {
    mockReaddir.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const result = await listConversations();
    expect(result).toEqual([]);
  });

  it("should ignore non-json files", async () => {
    const conv: Conversation = {
      id: "abc",
      model: "openai/gpt-5-mini",
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: "2026-04-30T10:00:00.000Z",
      messages: [],
    };
    mockReaddir.mockResolvedValue(["abc.json", ".DS_Store", "readme.txt"]);
    mockReadFile.mockResolvedValue(JSON.stringify(conv));

    const result = await listConversations();
    expect(result).toHaveLength(1);
  });
});

describe("getLatestConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the most recently updated conversation", async () => {
    const older: Conversation = {
      id: "old",
      model: "openai/gpt-5-mini",
      createdAt: "2026-04-29T10:00:00.000Z",
      updatedAt: "2026-04-29T10:00:00.000Z",
      messages: [],
    };
    const newer: Conversation = {
      id: "new",
      model: "openai/gpt-5-mini",
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: "2026-04-30T10:00:00.000Z",
      messages: [],
    };

    mockReaddir.mockResolvedValue(["old.json", "new.json"]);
    mockReadFile.mockImplementation(async (path: string) => {
      if (path.includes("old.json")) return JSON.stringify(older);
      if (path.includes("new.json")) return JSON.stringify(newer);
      throw new Error("unexpected path");
    });

    const result = await getLatestConversation();
    expect(result?.id).toBe("new");
  });

  it("should return undefined when no conversations exist", async () => {
    mockReaddir.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const result = await getLatestConversation();
    expect(result).toBeUndefined();
  });
});
