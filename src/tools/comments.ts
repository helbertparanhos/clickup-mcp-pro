import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z.boolean().optional(),
  team_id: teamIdParam,
};

export const commentTools = [
  // ── Task comments ─────────────────────────────────────────────────────────
  defineTool({
    name: "get_task_comments",
    description: "List comments on a task.",
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      start: z.number().int().optional().describe("Unix ms cursor for pagination."),
      start_id: z.string().optional(),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, ...params } = args;
      return client.get(`/task/${task_id}/comment`, { params });
    },
  }),

  defineTool({
    name: "create_task_comment",
    description: "Add a comment to a task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      comment_text: z.string().describe("Comment body."),
      assignee: z.union([z.string(), z.number()]).optional().describe("Assign the comment to a user."),
      notify_all: z.boolean().optional(),
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
    description: "List comments on a List.",
    schema: z.object({ list_id: z.string().describe("List ID.") }),
    handler: async (args, client) => client.get(`/list/${args.list_id}/comment`),
  }),

  defineTool({
    name: "create_list_comment",
    description: "Add a comment to a List.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("List ID."),
      comment_text: z.string(),
      assignee: z.union([z.string(), z.number()]).optional(),
      notify_all: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const { list_id, ...body } = args;
      return client.post(`/list/${list_id}/comment`, { body });
    },
  }),

  // ── Chat-view comments (legacy "chat" on a view) ──────────────────────────
  defineTool({
    name: "get_chat_view_comments",
    description: "List comments on a Chat view.",
    schema: z.object({ view_id: z.string().describe("Chat view ID.") }),
    handler: async (args, client) => client.get(`/view/${args.view_id}/comment`),
  }),

  defineTool({
    name: "create_chat_view_comment",
    description: "Add a comment to a Chat view.",
    write: true,
    schema: z.object({
      view_id: z.string().describe("Chat view ID."),
      comment_text: z.string(),
      notify_all: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const { view_id, ...body } = args;
      return client.post(`/view/${view_id}/comment`, { body });
    },
  }),

  // ── Comment CRUD + threads ────────────────────────────────────────────────
  defineTool({
    name: "update_comment",
    description: "Edit a comment's text, assignee or resolved state.",
    write: true,
    schema: z.object({
      comment_id: z.string().describe("Comment ID."),
      comment_text: z.string().optional(),
      assignee: z.union([z.string(), z.number()]).optional(),
      resolved: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const { comment_id, ...body } = args;
      return client.put(`/comment/${comment_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_comment",
    description: "Delete a comment.",
    write: true,
    schema: z.object({ comment_id: z.string().describe("Comment ID.") }),
    handler: async (args, client) => {
      await client.del(`/comment/${args.comment_id}`);
      return { deleted: true, comment_id: args.comment_id };
    },
  }),

  defineTool({
    name: "get_threaded_comments",
    description: "Get the threaded replies of a comment.",
    schema: z.object({ comment_id: z.string().describe("Parent comment ID.") }),
    handler: async (args, client) => client.get(`/comment/${args.comment_id}/reply`),
  }),

  defineTool({
    name: "create_threaded_comment",
    description: "Reply to a comment (threaded).",
    write: true,
    schema: z.object({
      comment_id: z.string().describe("Parent comment ID."),
      comment_text: z.string(),
      assignee: z.union([z.string(), z.number()]).optional(),
      notify_all: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const { comment_id, ...body } = args;
      return client.post(`/comment/${comment_id}/reply`, { body });
    },
  }),
];
