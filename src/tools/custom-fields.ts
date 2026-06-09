import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z.boolean().optional(),
  team_id: teamIdParam,
};

export const customFieldTools = [
  defineTool({
    name: "get_list_custom_fields",
    description: "List the custom fields available on a List (with their ids and type config).",
    schema: z.object({ list_id: z.string().describe("List ID.") }),
    handler: async (args, client) => client.get(`/list/${args.list_id}/field`),
  }),

  defineTool({
    name: "get_folder_custom_fields",
    description: "List custom fields accessible at the Folder level.",
    schema: z.object({ folder_id: z.string().describe("Folder ID.") }),
    handler: async (args, client) => client.get(`/folder/${args.folder_id}/field`),
  }),

  defineTool({
    name: "get_space_custom_fields",
    description: "List custom fields accessible at the Space level.",
    schema: z.object({ space_id: z.string().describe("Space ID.") }),
    handler: async (args, client) => client.get(`/space/${args.space_id}/field`),
  }),

  defineTool({
    name: "get_workspace_custom_fields",
    description: "List custom fields accessible at the Workspace/Team level.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/field`),
  }),

  defineTool({
    name: "set_custom_field_value",
    description:
      "Set a custom field value on a task. The `value` shape depends on the field type (text, number, drop_down option id, labels array, date epoch ms, users array, etc).",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      field_id: z.string().describe("Custom field ID."),
      value: z.any().describe("Value matching the field's type."),
      value_options: z.record(z.any()).optional(),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, field_id, value, value_options, custom_task_ids, team_id } = args;
      return client.post(`/task/${task_id}/field/${field_id}`, {
        params: { custom_task_ids, team_id },
        body: { value, value_options },
      });
    },
  }),

  defineTool({
    name: "remove_custom_field_value",
    description: "Remove/clear a custom field value from a task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      field_id: z.string().describe("Custom field ID."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, field_id, custom_task_ids, team_id } = args;
      await client.del(`/task/${task_id}/field/${field_id}`, {
        params: { custom_task_ids, team_id },
      });
      return { removed: true, task_id, field_id };
    },
  }),
];
