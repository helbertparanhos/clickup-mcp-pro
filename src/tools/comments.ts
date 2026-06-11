import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z
    .boolean()
    .optional()
    .describe("Set true when `task_id` is a custom task ID instead of a native ClickUp ID. Requires `team_id`."),
  team_id: teamIdParam,
};

export const commentTools = [
  // ── Task comments ─────────────────────────────────────────────────────────
  defineTool({
    name: "get_task_comments",
    description:
      "List all comments on a task, newest first. Returns each comment's id, text, author, creation date, assignee and resolved state. Use to read a task's discussion history before replying or to audit activity. Supports cursor pagination via `start` + `start_id`.",
    schema: z.object({
      task_id: z.string().describe("ID of the task to read comments from."),
      start: z
        .number()
        .int()
        .optional()
        .describe("Unix timestamp in milliseconds to page backwards from (cursor). Use the date of the oldest comment already fetched."),
      start_id: z
        .string()
        .optional()
        .describe("Comment ID to start paginating from, used together with `start` to fetch the next page."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, ...params } = args;
      return client.get(`/task/${task_id}/comment`, { params });
    },
  }),

  defineTool({
    name: "create_task_comment",
    description:
      "Post a new comment on a task. Optionally assign it to a user and notify all watchers. Returns the created comment's id. Use to leave feedback, ask questions or record an update directly on a task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to comment on."),
      comment_text: z.string().describe("The comment body text (plain text or ClickUp markdown)."),
      assignee: z
        .union([z.string(), z.number()])
        .optional()
        .describe("User ID to assign this comment to, turning it into an actionable item for that person."),
      notify_all: z
        .boolean()
        .optional()
        .describe("If true, notify everyone with access to the task; if false/omitted, only the assignee is notified."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, custom_task_ids, team_id, ...body } = args;
      return client.post(`/task/${task_id}/comment`, {
        params: { custom_task_ids, team_id },
        body,
      });
    },
  }),

  // ── List comments ─────────────────────────────────────────────────────────
  defineTool({
    name: "get_list_comments",
    description:
      "List all comments attached to a List (List-level discussion, separate from individual task comments), newest first. Returns each comment's id, text, author and date.",
    schema: z.object({ list_id: z.string().describe("ID of the List to read comments from.") }),
    handler: async (args, client) => client.get(`/list/${args.list_id}/comment`),
  }),

  defineTool({
    name: "create_list_comment",
    description:
      "Post a new comment on a List. Optionally assign it to a user and notify watchers. Returns the created comment's id. Use for List-level notes that don't belong to a specific task.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("ID of the List to comment on."),
      comment_text: z.string().describe("The comment body text (plain text or ClickUp markdown)."),
      assignee: z
        .union([z.string(), z.number()])
        .optional()
        .describe("User ID to assign this comment to."),
      notify_all: z
        .boolean()
        .optional()
        .describe("If true, notify everyone with access to the List; otherwise only the assignee is notified."),
    }),
    handler: async (args, client) => {
      const { list_id, ...body } = args;
      return client.post(`/list/${list_id}/comment`, { body });
    },
  }),

  // ── Chat-view comments (legacy "chat" on a view) ──────────────────────────
  defineTool({
    name: "get_chat_view_comments",
    description:
      "List all messages in a legacy Chat view (a view of type 'chat'), newest first. Returns each message's id, text, author and date. Use for ClickUp's older chat-on-a-view feature (not the newer v3 Chat channels).",
    schema: z.object({ view_id: z.string().describe("ID of the Chat view to read messages from.") }),
    handler: async (args, client) => client.get(`/view/${args.view_id}/comment`),
  }),

  defineTool({
    name: "create_chat_view_comment",
    description:
      "Post a message into a legacy Chat view. Optionally notify all members of the view. Returns the created message's id.",
    write: true,
    schema: z.object({
      view_id: z.string().describe("ID of the Chat view to post into."),
      comment_text: z.string().describe("The message body text (plain text or ClickUp markdown)."),
      notify_all: z
        .boolean()
        .optional()
        .describe("If true, notify everyone with access to the view."),
    }),
    handler: async (args, client) => {
      const { view_id, ...body } = args;
      return client.post(`/view/${view_id}/comment`, { body });
    },
  }),

  // ── Comment CRUD + threads ────────────────────────────────────────────────
  defineTool({
    name: "update_comment",
    description:
      "Edit an existing comment: change its text, reassign it, or mark it resolved/unresolved. Only the fields you provide are changed. Returns the updated comment. Works for task, List and Chat-view comments.",
    write: true,
    schema: z.object({
      comment_id: z.string().describe("ID of the comment to edit."),
      comment_text: z.string().optional().describe("New body text for the comment. Omit to keep the current text."),
      assignee: z
        .union([z.string(), z.number()])
        .optional()
        .describe("User ID to reassign the comment to. Omit to keep the current assignee."),
      resolved: z
        .boolean()
        .optional()
        .describe("Set true to mark the comment resolved, false to reopen it. Omit to leave unchanged."),
    }),
    handler: async (args, client) => {
      const { comment_id, ...body } = args;
      return client.put(`/comment/${comment_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_comment",
    description:
      "Permanently delete a comment by id. This cannot be undone. Returns a confirmation object with the deleted comment id.",
    write: true,
    schema: z.object({ comment_id: z.string().describe("ID of the comment to delete.") }),
    handler: async (args, client) => {
      await client.del(`/comment/${args.comment_id}`);
      return { deleted: true, comment_id: args.comment_id };
    },
  }),

  defineTool({
    name: "get_threaded_comments",
    description:
      "List the threaded replies under a parent comment, oldest first. Returns each reply's id, text, author and date. Use to read a full comment thread after spotting a parent comment.",
    schema: z.object({ comment_id: z.string().describe("ID of the parent comment whose replies to fetch.") }),
    handler: async (args, client) => client.get(`/comment/${args.comment_id}/reply`),
  }),

  defineTool({
    name: "create_threaded_comment",
    description:
      "Reply to an existing comment, creating a threaded response under it. Optionally assign the reply and notify watchers. Returns the created reply's id.",
    write: true,
    schema: z.object({
      comment_id: z.string().describe("ID of the parent comment to reply to."),
      comment_text: z.string().describe("The reply body text (plain text or ClickUp markdown)."),
      assignee: z
        .union([z.string(), z.number()])
        .optional()
        .describe("User ID to assign this reply to."),
      notify_all: z
        .boolean()
        .optional()
        .describe("If true, notify everyone with access; otherwise only the assignee is notified."),
    }),
    handler: async (args, client) => {
      const { comment_id, ...body } = args;
      return client.post(`/comment/${comment_id}/reply`, { body });
    },
  }),
];
