import { z } from "zod";
import { defineTool, dateInput, toEpochMs } from "../types.js";

const listBody = z.object({
  name: z.string().optional().describe("Display name of the List."),
  content: z.string().optional().describe("List description / notes shown at the top of the List."),
  due_date: dateInput
    .optional()
    .describe("Due date for the List. Accepts natural language ('tomorrow', 'in 3 days'), ISO date, or epoch milliseconds."),
  due_date_time: z.boolean().optional().describe("If true, the due_date includes a specific time of day (not just a date)."),
  priority: z.number().int().min(1).max(4).optional().describe("Priority: 1=urgent, 2=high, 3=normal, 4=low."),
  assignee: z.union([z.string(), z.number()]).optional().describe("User id set as the default assignee for new tasks in the List."),
  status: z.string().optional().describe("List color/status name (the List's accent label)."),
});

export const listTools = [
  defineTool({
    name: "get_lists_in_folder",
    description:
      "List all Lists inside a Folder, with each List's id, name and task count. Use to discover a `list_id` within a Folder.",
    schema: z.object({
      folder_id: z.string().describe("ID of the Folder whose Lists to fetch."),
      archived: z.boolean().optional().describe("If true, include archived Lists. Defaults to false."),
    }),
    handler: async (args, client) =>
      client.get(`/folder/${args.folder_id}/list`, {
        params: { archived: args.archived ?? false },
      }),
  }),

  defineTool({
    name: "get_folderless_lists",
    description:
      "List all folderless Lists that live directly under a Space (not inside any Folder), with their ids and names. Use to find Lists that aren't grouped in a Folder.",
    schema: z.object({
      space_id: z.string().describe("ID of the Space whose folderless Lists to fetch."),
      archived: z.boolean().optional().describe("If true, include archived Lists. Defaults to false."),
    }),
    handler: async (args, client) =>
      client.get(`/space/${args.space_id}/list`, {
        params: { archived: args.archived ?? false },
      }),
  }),

  defineTool({
    name: "get_list",
    description:
      "Get a single List by id, including its name, content, statuses, task count and settings. Use to inspect a List before creating or filtering tasks in it.",
    schema: z.object({ list_id: z.string().describe("ID of the List to fetch.") }),
    handler: async (args, client) => client.get(`/list/${args.list_id}`),
  }),

  defineTool({
    name: "create_list_in_folder",
    description:
      "Create a new List inside a Folder, optionally setting its description, due date, priority, default assignee and status. Returns the created List with its id.",
    write: true,
    schema: z
      .object({
        folder_id: z.string().describe("ID of the Folder to create the List in."),
        name: z.string().describe("Name for the new List."),
      })
      .merge(listBody.omit({ name: true })),
    handler: async (args, client) => {
      const { folder_id, due_date, ...rest } = args;
      return client.post(`/folder/${folder_id}/list`, {
        body: { ...rest, due_date: toEpochMs(due_date) },
      });
    },
  }),

  defineTool({
    name: "create_folderless_list",
    description:
      "Create a new List directly under a Space (not inside any Folder), optionally setting description, due date, priority, default assignee and status. Returns the created List with its id.",
    write: true,
    schema: z
      .object({
        space_id: z.string().describe("ID of the Space to create the List in."),
        name: z.string().describe("Name for the new List."),
      })
      .merge(listBody.omit({ name: true })),
    handler: async (args, client) => {
      const { space_id, due_date, ...rest } = args;
      return client.post(`/space/${space_id}/list`, {
        body: { ...rest, due_date: toEpochMs(due_date) },
      });
    },
  }),

  defineTool({
    name: "create_list_from_template_in_folder",
    description:
      "Create a List in a Folder from a List template, reproducing the template's statuses, fields and (optionally) tasks. Returns the created List. Use to spin up a standardized List layout.",
    write: true,
    schema: z.object({
      folder_id: z.string().describe("ID of the Folder to create the List in."),
      template_id: z.string().describe("ID of the List template to instantiate."),
      name: z.string().describe("Name for the new List."),
      options: z
        .record(z.any())
        .optional()
        .describe("Optional template import options, e.g. { return_immediately: true, content: {...} }."),
    }),
    handler: async (args, client) =>
      client.post(`/folder/${args.folder_id}/list_template/${args.template_id}`, {
        body: { name: args.name, options: args.options },
      }),
  }),

  defineTool({
    name: "update_list",
    description:
      "Update a List — change its name, content, due date, priority, default assignee or status. Only the provided fields change. Returns the updated List.",
    write: true,
    schema: z.object({ list_id: z.string().describe("ID of the List to update.") }).merge(listBody),
    handler: async (args, client) => {
      const { list_id, due_date, ...rest } = args;
      return client.put(`/list/${list_id}`, {
        body: { ...rest, due_date: toEpochMs(due_date) },
      });
    },
  }),

  defineTool({
    name: "delete_list",
    description:
      "Permanently delete a List and all tasks inside it. This cannot be undone. Returns a confirmation with the deleted List id.",
    write: true,
    schema: z.object({ list_id: z.string().describe("ID of the List to delete.") }),
    handler: async (args, client) => {
      await client.del(`/list/${args.list_id}`);
      return { deleted: true, list_id: args.list_id };
    },
  }),

  defineTool({
    name: "get_list_views",
    description:
      "List the Views configured on a List (List, Board, Calendar, etc.), with each View's id and type. Use to find a `view_id` to read tasks as that View shows them.",
    schema: z.object({ list_id: z.string().describe("ID of the List whose Views to list.") }),
    handler: async (args, client) => client.get(`/list/${args.list_id}/view`),
  }),
];
