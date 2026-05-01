import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockListConversations, mockLoadConversation } = vi.hoisted(() => ({
  mockListConversations: vi.fn(),
  mockLoadConversation: vi.fn(),
}));

vi.mock("../utils/conversation.ts", () => ({
  listConversations: mockListConversations,
  loadConversation: mockLoadConversation,
}));

import { conversations } from "./conversations.ts";
import type { Conversation } from "../utils/conversation.ts";

function makeConversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: "abcd1234-5678-9abc-def0-123456789abc",
    model: "openai/gpt-5-mini",
    createdAt: "2026-04-30T10:00:00.000Z",
    updatedAt: "2026-04-30T10:00:00.000Z",
    messages: [],
    ...overrides,
  };
}

describe("conversations list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should display ID (8 chars), Rounds, Prompt (40 chars), Updated", async () => {
    const conv = makeConversation({
      messages: [
        { role: "user", content: [{ type: "text", text: "Hello world" }] },
        {
          role: "assistant",
          content: [{ type: "text", text: "Hi there" }],
        },
        {
          role: "user",
          content: [{ type: "text", text: "Follow up question" }],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "Another answer" }],
        },
      ],
    });
    mockListConversations.mockResolvedValue([conv]);

    const cmd = conversations();
    await cmd.parseAsync(["node", "test", "list"]);

    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    // Should show truncated ID (8 chars)
    expect(output).toContain("abcd1234");
    expect(output).not.toContain("abcd1234-5678");
    // Should show rounds count (2 user messages)
    expect(output).toContain("2");
    // Should show prompt
    expect(output).toContain("Hello world");
    // Should have column headers
    expect(output).toContain("ID");
    expect(output).toContain("Rounds");
    expect(output).toContain("Prompt");
    expect(output).toContain("Updated");
    // Should NOT have Model column
    expect(output).not.toContain("Model");
  });

  it("should default to list when no subcommand is given", async () => {
    const conv = makeConversation({
      messages: [
        { role: "user", content: [{ type: "text", text: "Hello" }] },
        { role: "assistant", content: [{ type: "text", text: "Hi" }] },
      ],
    });
    mockListConversations.mockResolvedValue([conv]);

    const cmd = conversations();
    await cmd.parseAsync(["node", "test"]);

    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    expect(output).toContain("abcd1234");
    expect(output).toContain("Rounds");
  });
});

describe("conversations show", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should display frontmatter header with id, dates, and model", async () => {
    const conv = makeConversation({
      id: "abcd1234-5678-9abc-def0-123456789abc",
      model: "openai/gpt-5-mini",
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: "2026-04-30T12:00:00.000Z",
      messages: [
        { role: "user", content: [{ type: "text", text: "Hello" }] },
        { role: "assistant", content: [{ type: "text", text: "Hi there" }] },
      ],
    });
    mockListConversations.mockResolvedValue([conv]);

    const cmd = conversations();
    await cmd.parseAsync(["node", "test", "show", "abcd1234"]);

    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    // Frontmatter delimiters
    expect(output).toMatch(/^---\n/);
    expect(output).toContain("\n---\n");
    // Metadata fields
    expect(output).toContain("id: abcd1234-5678-9abc-def0-123456789abc");
    expect(output).toContain("created: 2026-04-30T10:00:00.000Z");
    expect(output).toContain("updated: 2026-04-30T12:00:00.000Z");
    expect(output).toContain("model: openai/gpt-5-mini");
    // Messages still present after frontmatter
    expect(output).toContain("Hello");
    expect(output).toContain("Hi there");
  });

  it("should error when prefix matches multiple conversations", async () => {
    const conv1 = makeConversation({
      id: "abcd1111-0000-0000-0000-000000000000",
    });
    const conv2 = makeConversation({
      id: "abcd2222-0000-0000-0000-000000000000",
    });
    mockListConversations.mockResolvedValue([conv1, conv2]);

    const cmd = conversations();
    await cmd.parseAsync(["node", "test", "show", "abcd"]);

    const errors = vi.mocked(console.error).mock.calls
      .map((c) => c[0])
      .join("\n");
    expect(errors).toContain("Ambiguous");
    expect(errors).toContain("abcd1111");
    expect(errors).toContain("abcd2222");
    // Should not display any conversation content
    expect(vi.mocked(console.log)).not.toHaveBeenCalled();
  });

  it("should error when no conversation matches the prefix", async () => {
    mockListConversations.mockResolvedValue([]);

    const cmd = conversations();
    await cmd.parseAsync(["node", "test", "show", "zzzz"]);

    const errors = vi.mocked(console.error).mock.calls
      .map((c) => c[0])
      .join("\n");
    expect(errors).toContain("No conversation found");
    expect(vi.mocked(console.log)).not.toHaveBeenCalled();
  });

  it("should show user and assistant text with plain labels, hide system messages", async () => {
    const conv = makeConversation({
      messages: [
        { role: "system", content: "You are helpful" },
        { role: "user", content: [{ type: "text", text: "What is 2+2?" }] },
        { role: "assistant", content: [{ type: "text", text: "4" }] },
      ],
    });
    mockListConversations.mockResolvedValue([conv]);

    const cmd = conversations();
    await cmd.parseAsync(["node", "test", "show", "abcd1234"]);

    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    // Should contain role labels
    expect(output).toContain("> You:");
    expect(output).toContain("> Assistant:");
    // Should contain message content
    expect(output).toContain("What is 2+2?");
    expect(output).toContain("4");
    // Should NOT contain system message content
    expect(output).not.toContain("You are helpful");
  });

  it("should show placeholders for images and tool calls", async () => {
    const conv = makeConversation({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this" },
            { type: "image", image: new Uint8Array(), mediaType: "image/png" },
          ],
        },
        {
          role: "assistant",
          content: [
            { type: "tool-call", toolCallId: "1", toolName: "search", input: {} },
          ],
        },
      ],
    });
    mockListConversations.mockResolvedValue([conv]);

    const cmd = conversations();
    await cmd.parseAsync(["node", "test", "show", "abcd1234"]);

    const output = vi.mocked(console.log).mock.calls[0]?.[0] as string;
    expect(output).toContain("Describe this");
    expect(output).toContain("[image attachment]");
    expect(output).toContain("[tool call: search]");
  });
});
