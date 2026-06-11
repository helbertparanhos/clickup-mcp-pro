import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z
    .boolean()
    .optional()
    .describe("Set true when `task_id` is a custom task ID instead of a native ClickUp ID. Requires `team_id`."),
  team_id: teamIdParam,
};

export const customFieldTools = [
  defineTool({
    name: "get_list_custom_fields",
    description:
      "List the custom fields available on a List, with each field's id, name, type and type configuration (e.g. dropdown options, currency settings). Use to discover a `field_id` and its valid values before setting it on a task.",
    schema: z.object({ list_id: z.string().describe("ID of the List to read custom fields from.") }),
    handler: async (args, client) => client.get(`/list/${args.list_id}/field`),
  }),

  defineTool({
    name: "get_folder_custom_fields",
    description:
      "List the custom fields accessible at the Folder level, with their ids, names, types and configuration. Use to discover fields inherited by the Folder's Lists.",
    schema: z.object({ folder_id: z.string().describe("ID of the Folder to read custom fields from.") }),
    handler: async (args, client) => client.get(`/folder/${args.folder_id}/field`),
  }),

  defineTool({
    name: "get_space_custom_fields",
    description:
      "List the custom fields accessible at the Space level, with their ids, names, types and configuration. Use to discover Space-wide fields.",
    schema: z.object({ space_id: z.string().describe("ID of the Space to read custom fields from.") }),
    handler: async (args, client) => client.get(`/space/${args.space_id}/field`),
  }),

  defineTool({
    name: "get_workspace_custom_fields",
    description:
      "List the custom fields accessible at the Workspace/Team level, with their ids, names, types and configuration. Use to discover org-wide fields.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/field`),
  }),

  defineTool({
    name: "set_custom_field_value",
    description:
      "Set (or overwrite) a custom field's value on a task. The `value` shape depends on the field type: text/number → primitive; drop_down → the option id; labels → array of option ids; date → epoch milliseconds; users → array of user ids. Look up the field type first with one of the get_*_custom_fields tools.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to set the field on."),
      field_id: z.string().describe("ID of the custom field (from a get_*_custom_fields tool)."),
      value: z.any().describe("The value to set, in the shape required by the field's type (see the tool description)."),
      value_options: z
        .record(z.any())
        .optional()
        .describe("Optional extra options for the value, e.g. { time: true } to include a time component for date fields."),
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
    description:
      "Clear a custom field's value on a task, resetting it to empty. Returns a confirmation with the task and field ids. Use to unset a field rather than overwrite it.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to clear the field on."),
      field_id: z.string().describe("ID of the custom field to clear."),
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
