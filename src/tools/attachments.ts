import { z } from "zod";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import FormData from "form-data";
import { defineTool, teamIdParam } from "../types.js";
import {
  fetchPublicHttpsToBuffer,
  assertSafeUploadPath,
  MAX_ATTACHMENT_BYTES,
} from "../security.js";

function assertSize(bytes: number) {
  if (bytes > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Attachment is ${bytes} bytes, exceeding the ${MAX_ATTACHMENT_BYTES}-byte limit ` +
        `(configure CLICKUP_MAX_UPLOAD_BYTES to change).`
    );
  }
}

export const attachmentTools = [
  defineTool({
    name: "upload_task_attachment",
    description:
      "Attach a file to a task. Provide exactly one source: file_path (local), url (remote file to fetch), or base64 (raw content). file_name is required when using base64.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      file_path: z.string().optional().describe("Absolute local file path."),
      url: z
        .string()
        .optional()
        .describe("Remote HTTPS file URL to download and attach (private/loopback hosts are rejected)."),
      base64: z.string().optional().describe("Base64-encoded file content."),
      file_name: z.string().optional().describe("File name (required for base64; overrides others)."),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe("Set true when `task_id` is a custom task ID instead of a native ClickUp ID. Requires `team_id`."),
      team_id: teamIdParam,
    }),
    handler: async (args, client) => {
      const { task_id, file_path, url, base64, file_name, custom_task_ids, team_id } = args;
      const sources = [file_path, url, base64].filter(Boolean).length;
      if (sources !== 1)
        throw new Error("Provide exactly one of file_path, url, or base64.");

      let buffer: Buffer;
      let name = file_name;

      if (file_path) {
        const safePath = assertSafeUploadPath(file_path);
        buffer = await readFile(safePath);
        assertSize(buffer.byteLength);
        name = name ?? basename(safePath);
      } else if (url) {
        // Anti-SSRF: HTTPS-only, IP-pinned, no redirects, streamed size cap.
        buffer = await fetchPublicHttpsToBuffer(url);
        name = name ?? basename(new URL(url).pathname) ?? "attachment";
      } else {
        buffer = Buffer.from(base64 as string, "base64");
        assertSize(buffer.byteLength);
        if (!name) throw new Error("file_name is required when using base64.");
      }

      const form = new FormData();
      form.append("attachment", buffer, { filename: name });

      return client.post(`/task/${task_id}/attachment`, {
        params: { custom_task_ids, team_id },
        form,
      });
    },
  }),

  defineTool({
    name: "list_task_attachments",
    description:
      "List the attachments currently on a task (read from the task object — ClickUp returns attachments inline).",
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe("Set true when `task_id` is a custom task ID instead of a native ClickUp ID. Requires `team_id`."),
      team_id: teamIdParam,
    }),
    handler: async (args, client) => {
      const { task_id, custom_task_ids, team_id } = args;
      const task = await client.get(`/task/${task_id}`, {
        params: { custom_task_ids, team_id, include_subtasks: false },
      });
      return { task_id, attachments: task.attachments ?? [] };
    },
  }),
];
