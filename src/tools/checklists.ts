import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z.boolean().optional(),
  team_id: teamIdParam,
};

export const checklistTools = [
  defineTool({
    name: "create_checklist",
    description: "Create a checklist on a task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      name: z.string().describe("Checklist name."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, name, custom_task_ids, team_id } = args;
      return client.post(`/task/${task_id}/checklist`, {
        params: { custom_task_ids, team_id },
        body: { name },
      });
    },
  }),

  defineTool({
    name: "edit_checklist",
    description: "Rename or reposition a checklist.",
    write: true,
    schema: z.object({
      checklist_id: z.string().describe("Checklist ID."),
      name: z.string().optional(),
      position: z.number().int().optional(),
    }),
    handler: async (args, client) => {
      const { checklist_id, ...body } = args;
      return client.put(`/checklist/${checklist_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_checklist",
    description: "Delete a checklist.",
    write: true,
    schema: z.object({ checklist_id: z.string().describe("Checklist ID.") }),
    handler: async (args, client) => {
      await client.del(`/checklist/${args.checklist_id}`);
      return { deleted: true, checklist_id: args.checklist_id };
    },
  }),

  defineTool({
    name: "create_checklist_item",
    description: "Add an item to a checklist.",
    write: true,
    schema: z.object({
      checklist_id: z.string().describe("Checklist ID."),
      name: z.string().describe("Item text."),
      assignee: z.union([z.string(), z.number()]).optional(),
    }),
    handler: async (args, client) => {
      const { checklist_id, ...body } = args;
      return client.post(`/checklist/${checklist_id}/checklist_item`, { body });
    },
  }),

  defineTool({
    name: "edit_checklist_item",
    description: "Edit a checklist item (name, assignee, resolved state, parent, nesting).",
    write: true,
    schema: z.object({
      checklist_id: z.string().describe("Checklist ID."),
      checklist_item_id: z.string().describe("Checklist item ID."),
      name: z.string().optional(),
      assignee: z.union([z.string(), z.number()]).nullable().optional(),
      resolved: z.boolean().optional(),
      parent: z.string().nullable().optional().describe("Parent item id for nesting."),
    }),
    handler: async (args, client) => {
      const { checklist_id, checklist_item_id, ...body } = args;
      return client.put(`/checklist/${checklist_id}/checklist_item/${checklist_item_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_checklist_item",
    description: "Delete a checklist item.",
    write: true,
    schema: z.object({
      checklist_id: z.string().describe("Checklist ID."),
      checklist_item_id: z.string().describe("Checklist item ID."),
    }),
    handler: async (args, client) => {
      await client.del(`/checklist/${args.checklist_id}/checklist_item/${args.checklist_item_id}`);
      return { deleted: true, checklist_item_id: args.checklist_item_id };
    },
  }),
];
