import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const WEBHOOK_EVENTS = [
  "taskCreated", "taskUpdated", "taskDeleted", "taskPriorityUpdated", "taskStatusUpdated",
  "taskAssigneeUpdated", "taskDueDateUpdated", "taskTagUpdated", "taskMoved", "taskCommentPosted",
  "taskCommentUpdated", "taskTimeEstimateUpdated", "taskTimeTrackedUpdated", "listCreated",
  "listUpdated", "listDeleted", "folderCreated", "folderUpdated", "folderDeleted", "spaceCreated",
  "spaceUpdated", "spaceDeleted", "goalCreated", "goalUpdated", "goalDeleted", "keyResultCreated",
  "keyResultUpdated", "keyResultDeleted",
] as const;

export const webhookTools = [
  defineTool({
    name: "list_webhooks",
    description: "List the webhooks registered for a Workspace.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/webhook`),
  }),

  defineTool({
    name: "create_webhook",
    description:
      "Create a webhook. Optionally scope it to a space/folder/list/task; omit scope for the whole Workspace.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      endpoint: z.string().describe("HTTPS URL that will receive events."),
      events: z
        .array(z.enum(WEBHOOK_EVENTS))
        .min(1)
        .describe('Events to subscribe to, or ["*"] equivalent by listing all.'),
      space_id: z.union([z.string(), z.number()]).optional(),
      folder_id: z.union([z.string(), z.number()]).optional(),
      list_id: z.union([z.string(), z.number()]).optional(),
      task_id: z.string().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/team/${teamId}/webhook`, { body });
    },
  }),

  defineTool({
    name: "update_webhook",
    description: "Update a webhook's endpoint, events or status.",
    write: true,
    schema: z.object({
      webhook_id: z.string().describe("Webhook ID."),
      endpoint: z.string().optional(),
      events: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
      status: z.enum(["active", "inactive"]).optional(),
    }),
    handler: async (args, client) => {
      const { webhook_id, ...body } = args;
      return client.put(`/webhook/${webhook_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_webhook",
    description: "Delete a webhook.",
    write: true,
    schema: z.object({ webhook_id: z.string().describe("Webhook ID.") }),
    handler: async (args, client) => {
      await client.del(`/webhook/${args.webhook_id}`);
      return { deleted: true, webhook_id: args.webhook_id };
    },
  }),
];
