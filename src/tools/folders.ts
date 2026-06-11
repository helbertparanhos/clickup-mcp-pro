import { z } from "zod";
import { defineTool } from "../types.js";

export const folderTools = [
  defineTool({
    name: "list_folders",
    description:
      "List all Folders inside a Space, with each Folder's id, name and the Lists it contains. Folders group Lists within a Space. Use to discover a `folder_id`.",
    schema: z.object({
      space_id: z.string().describe("ID of the Space whose Folders to list."),
      archived: z.boolean().optional().describe("If true, include archived Folders. Defaults to false."),
    }),
    handler: async (args, client) =>
      client.get(`/space/${args.space_id}/folder`, {
        params: { archived: args.archived ?? false },
      }),
  }),

  defineTool({
    name: "get_folder",
    description:
      "Get a single Folder by id, including its name and the Lists it contains (with their ids and task counts). Use to inspect a Folder or enumerate its Lists.",
    schema: z.object({ folder_id: z.string().describe("ID of the Folder to fetch.") }),
    handler: async (args, client) => client.get(`/folder/${args.folder_id}`),
  }),

  defineTool({
    name: "create_folder",
    description:
      "Create an empty Folder inside a Space. Returns the created Folder with its id. Use to group related Lists together.",
    write: true,
    schema: z.object({
      space_id: z.string().describe("ID of the Space to create the Folder in."),
      name: z.string().describe("Name for the new Folder."),
    }),
    handler: async (args, client) =>
      client.post(`/space/${args.space_id}/folder`, { body: { name: args.name } }),
  }),

  defineTool({
    name: "create_folder_from_template",
    description:
      "Create a Folder in a Space from a Folder template, reproducing the template's Lists, statuses and structure. Returns the created Folder. Use to spin up a standardized project layout.",
    write: true,
    schema: z.object({
      space_id: z.string().describe("ID of the Space to create the Folder in."),
      template_id: z.string().describe("ID of the Folder template to instantiate."),
      name: z.string().describe("Name for the new Folder."),
      options: z
        .record(z.any())
        .optional()
        .describe("Optional template import options, e.g. { return_immediately: true, content: {...} }."),
    }),
    handler: async (args, client) =>
      client.post(`/space/${args.space_id}/folder_template/${args.template_id}`, {
        body: { name: args.name, options: args.options },
      }),
  }),

  defineTool({
    name: "update_folder",
    description: "Rename a Folder. Returns the updated Folder. Use to change a Folder's display name.",
    write: true,
    schema: z.object({
      folder_id: z.string().describe("ID of the Folder to rename."),
      name: z.string().describe("New name for the Folder."),
    }),
    handler: async (args, client) =>
      client.put(`/folder/${args.folder_id}`, { body: { name: args.name } }),
  }),

  defineTool({
    name: "delete_folder",
    description:
      "Permanently delete a Folder and all Lists and tasks inside it. This cannot be undone. Returns a confirmation with the deleted Folder id.",
    write: true,
    schema: z.object({ folder_id: z.string().describe("ID of the Folder to delete.") }),
    handler: async (args, client) => {
      await client.del(`/folder/${args.folder_id}`);
      return { deleted: true, folder_id: args.folder_id };
    },
  }),

  defineTool({
    name: "get_folder_views",
    description:
      "List the Views configured on a Folder (List, Board, Calendar, Gantt, etc.), with each View's id and type. Use to find a `view_id` to read tasks from.",
    schema: z.object({ folder_id: z.string().describe("ID of the Folder whose Views to list.") }),
    handler: async (args, client) => client.get(`/folder/${args.folder_id}/view`),
  }),
];
