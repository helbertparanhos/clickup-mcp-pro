import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z
    .boolean()
    .optional()
    .describe("Set true when `task_id` is a custom task ID instead of a native ClickUp ID. Requires `team_id`."),
  team_id: teamIdParam,
};

export const checklistTools = [
  defineTool({
    name: "create_checklist",
    description:
      "Create a checklist (a named group of sub-items) on a task. Returns the created checklist with its id. Use to add a structured to-do list inside a task, then add items with `create_checklist_item`.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to add the checklist to."),
      name: z.string().describe("Name/title of the checklist."),
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
    description:
      "Rename a checklist and/or change its position among the task's checklists. Only the provided fields change. Returns the updated checklist.",
    write: true,
    schema: z.object({
      checklist_id: z.string().describe("ID of the checklist to edit."),
      name: z.string().optional().describe("New name for the checklist. Omit to keep the current name."),
      position: z
        .number()
        .int()
        .optional()
        .describe("0-based position of the checklist among the task's checklists (0 = first)."),
    }),
    handler: async (args, client) => {
      const { checklist_id, ...body } = args;
      return client.put(`/checklist/${checklist_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_checklist",
    description:
      "Permanently delete a checklist and all its items from a task. This cannot be undone. Returns a confirmation with the deleted checklist id.",
    write: true,
    schema: z.object({ checklist_id: z.string().describe("ID of the checklist to delete.") }),
    handler: async (args, client) => {
      await client.del(`/checklist/${args.checklist_id}`);
      return { deleted: true, checklist_id: args.checklist_id };
    },
  }),

  defineTool({
    name: "create_checklist_item",
    description:
      "Add a single item (a checkable line) to an existing checklist, optionally assigned to a user. Returns the updated checklist. Use after `create_checklist` to populate it.",
    write: true,
    schema: z.object({
      checklist_id: z.string().describe("ID of the checklist to add the item to."),
      name: z.string().describe("Text of the checklist item."),
      assignee: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Optional user id to assign the item to."),
    }),
    handler: async (args, client) => {
      const { checklist_id, ...body } = args;
      return client.post(`/checklist/${checklist_id}/checklist_item`, { body });
    },
  }),

  defineTool({
    name: "edit_checklist_item",
    description:
      "Edit a checklist item — change its text, assignee, resolved (checked) state, or nest it under a parent item. Only the provided fields change. Returns the updated checklist.",
    write: true,
    schema: z.object({
      checklist_id: z.string().describe("ID of the checklist the item belongs to."),
      checklist_item_id: z.string().describe("ID of the checklist item to edit."),
      name: z.string().optional().describe("New text for the item. Omit to keep current."),
      assignee: z
        .union([z.string(), z.number()])
        .nullable()
        .optional()
        .describe("User id to assign the item to, or null to clear the assignee. Omit to keep current."),
      resolved: z.boolean().optional().describe("Set true to check (resolve) the item, false to uncheck it."),
      parent: z
        .string()
        .nullable()
        .optional()
        .describe("ID of a parent checklist item to nest this one under, or null to un-nest it."),
    }),
    handler: async (args, client) => {
      const { checklist_id, checklist_item_id, ...body } = args;
      return client.put(`/checklist/${checklist_id}/checklist_item/${checklist_item_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_checklist_item",
    description:
      "Permanently delete a single item from a checklist. This cannot be undone. Returns a confirmation with the deleted item id.",
    write: true,
    schema: z.object({
      checklist_id: z.string().describe("ID of the checklist the item belongs to."),
      checklist_item_id: z.string().describe("ID of the checklist item to delete."),
    }),
    handler: async (args, client) => {
      await client.del(`/checklist/${args.checklist_id}/checklist_item/${args.checklist_item_id}`);
      return { deleted: true, checklist_item_id: args.checklist_item_id };
    },
  }),
];
