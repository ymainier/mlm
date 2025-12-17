import { readFile } from "node:fs/promises";
import { fileTypeFromBuffer } from "file-type";
import type { UserContent } from "ai";

type AttachmentContent = Exclude<UserContent, string>[number];

export async function getAttachmentContent(
  path: string,
): Promise<AttachmentContent> {
  const data = await readFile(path);
  const fileType = await fileTypeFromBuffer(data);
  const mediaType = fileType?.mime ?? "application/octet-stream";

  if (mediaType.startsWith("image/")) {
    return { type: "image", mediaType, image: data };
  }
  return { type: "file", mediaType, data };
}
