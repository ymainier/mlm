import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMessages } from "./get-messages.ts";
import { getAttachmentContent } from "./attachments.ts";

vi.mock("./attachments", () => ({ getAttachmentContent: vi.fn() }));

describe("getMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return user message with text content", async () => {
    const messages = await getMessages(undefined, "hello world");

    expect(messages).toEqual([
      { role: "user", content: [{ type: "text", text: "hello world" }] },
    ]);
  });

  it("should include system message when provided", async () => {
    const messages = await getMessages("You are a helpful assistant.", "test");

    expect(messages).toEqual([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: [{ type: "text", text: "test" }] },
    ]);
  });

  it("should include attachments before text content", async () => {
    vi.mocked(getAttachmentContent).mockResolvedValueOnce({
      type: "image",
      image: new URL("data:image/png;base64,abc"),
    });

    const messages = await getMessages(undefined, "describe this", [
      "image.png",
    ]);

    expect(getAttachmentContent).toHaveBeenCalledWith("image.png");
    expect(messages).toEqual([
      {
        role: "user",
        content: [
          { type: "image", image: new URL("data:image/png;base64,abc") },
          { type: "text", text: "describe this" },
        ],
      },
    ]);
  });

  it("should include attachments after system message", async () => {
    vi.mocked(getAttachmentContent).mockResolvedValueOnce({
      type: "image",
      image: new URL("data:image/png;base64,abc"),
    });

    const messages = await getMessages(
      "You are a helpful assistant.",
      "describe this",
      ["image.png"],
    );

    expect(getAttachmentContent).toHaveBeenCalledWith("image.png");
    expect(messages).toEqual([
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: [
          { type: "image", image: new URL("data:image/png;base64,abc") },
          { type: "text", text: "describe this" },
        ],
      },
    ]);
  });

  it("should handle multiple attachments", async () => {
    vi.mocked(getAttachmentContent)
      .mockResolvedValueOnce({
        type: "image",
        image: new URL("data:image/png;base64,first"),
      })
      .mockResolvedValueOnce({
        type: "file",
        data: "file content",
        mediaType: "text/plain",
      });

    const messages = await getMessages(undefined, "analyze these", [
      "first.png",
      "second.txt",
    ]);

    expect(getAttachmentContent).toHaveBeenCalledTimes(2);
    expect(messages).toEqual([
      {
        role: "user",
        content: [
          { type: "image", image: new URL("data:image/png;base64,first") },
          { type: "file", data: "file content", mediaType: "text/plain" },
          { type: "text", text: "analyze these" },
        ],
      },
    ]);
  });

  it("should handle empty attachments array", async () => {
    const messages = await getMessages(undefined, "test", []);

    expect(getAttachmentContent).not.toHaveBeenCalled();
    expect(messages).toEqual([
      { role: "user", content: [{ type: "text", text: "test" }] },
    ]);
  });

  it("should prepend fragmentsText to the user message", async () => {
    const messages = await getMessages(
      undefined,
      "summarize this",
      [],
      "fragment content",
    );

    expect(messages).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "fragment content\n\nsummarize this" }],
      },
    ]);
  });

  it("should not prepend when fragmentsText is undefined", async () => {
    const messages = await getMessages(undefined, "hello", [], undefined);

    expect(messages).toEqual([
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ]);
  });
});
