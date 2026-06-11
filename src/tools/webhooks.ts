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
    description:
      "List the webhooks registered for a Workspace, including each one's id, endpoint URL, subscribed events, scope and health status. Use to audit existing integrations before creating or deleting one.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/webhook`),
  }),

  defineTool({
    name: "create_webhook",
    description:
      "Create a webhook that POSTs event payloads to your HTTPS endpoint. Optionally scope it to a single space, folder, list or task; omit all scopes to watch the whole Workspace. Returns the created webhook with its id and signing secret.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      endpoint: z.string().describe("HTTPS URL that will receive the event POST requests."),
      events: z
        .array(z.enum(WEBHOOK_EVENTS))
        .min(1)
        .describe('Event names to subscribe to (e.g. ["taskCreated","taskStatusUpdated"]). List all events to receive everything.'),
      space_id: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Optional Space id to scope the webhook to a single Space."),
      folder_id: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Optional Folder id to scope the webhook to a single Folder."),
      list_id: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Optional List id to scope the webhook to a single List."),
      task_id: z.string().optional().describe("Optional Task id to scope the webhook to a single task."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/team/${teamId}/webhook`, { body });
    },
  }),

  defineTool({
    name: "update_webhook",
    description:
      "Update an existing webhook's endpoint URL, subscribed events, and/or active status. Only the provided fields change. Use `status: 'inactive'` to pause delivery without deleting. Returns the updated webhook.",
    write: true,
    schema: z.object({
      webhook_id: z.string().describe("ID of the webhook to update."),
      endpoint: z.string().optional().describe("New HTTPS endpoint URL. Omit to keep the current one."),
      events: z
        .array(z.enum(WEBHOOK_EVENTS))
        .optional()
        .describe("New full list of event names to subscribe to (replaces the previous list)."),
      status: z
        .enum(["active", "inactive"])
        .optional()
        .describe("Set 'active' to enable delivery or 'inactive' to pause it."),
    }),
    handler: async (args, client) => {
      const { webhook_id, ...body } = args;
      return client.put(`/webhook/${webhook_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_webhook",
    description:
      "Permanently delete a webhook by id, stopping all future event delivery to its endpoint. This cannot be undone. Returns a confirmation with the deleted webhook id.",
    write: true,
    schema: z.object({ webhook_id: z.string().describe("ID of the webhook to delete.") }),
    handler: async (args, client) => {
      await client.del(`/webhook/${args.webhook_id}`);
      return { deleted: true, webhook_id: args.webhook_id };
    },
  }),
];
