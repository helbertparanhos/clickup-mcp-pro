import { z } from "zod";
import { defineTool } from "../types.js";

export const folderTools = [
  defineTool({
    name: "list_folders",
    description: "List all Folders inside a Space.",
    schema: z.object({
      space_id: z.string().describe("Space ID."),
      archived: z.boolean().optional().describe("Include archived folders. Default false."),
    }),
    handler: async (args, client) =>
      client.get(`/space/${args.space_id}/folder`, {
        params: { archived: args.archived ?? false },
      }),
  }),

  defineTool({
    name: "get_folder",
    description: "Get a single Folder by id.",
    schema: z.object({ folder_id: z.string().describe("Folder ID.") }),
    handler: async (args, client) => client.get(`/folder/${args.folder_id}`),
  }),

  defineTool({
    name: "create_folder",
    description: "Create a Folder inside a Space.",
    write: true,
    schema: z.object({
      space_id: z.string().describe("Space ID."),
      name: z.string().describe("Folder name."),
    }),
    handler: async (args, client) =>
      client.post(`/space/${args.space_id}/folder`, { body: { name: args.name } }),
  }),

  defineTool({
    name: "create_folder_from_template",
    description: "Create a Folder in a Space from a Folder template.",
    write: true,
    schema: z.object({
      space_id: z.string().describe("Space ID."),
      template_id: z.string().describe("Folder template ID."),
      name: z.string().describe("New folder name."),
      options: z
        .record(z.any())
        .optional()
        .describe("Template import options (return_immediately, content, etc)."),
    }),
    handler: async (args, client) =>
      client.post(`/space/${args.space_id}/folder_template/${args.template_id}`, {
        body: { name: args.name, options: args.options },
      }),
  }),

  defineTool({
    name: "update_folder",
    description: "Rename or update a Folder.",
    write: true,
    schema: z.object({
      folder_id: z.string().describe("Folder ID."),
      name: z.string().describe("New folder name."),
    }),
    handler: async (args, client) =>
      client.put(`/folder/${args.folder_id}`, { body: { name: args.name } }),
  }),

  defineTool({
    name: "delete_folder",
    description: "Delete a Folder permanently.",
    write: true,
    schema: z.object({ folder_id: z.string().describe("Folder ID.") }),
    handler: async (args, client) => {
      await client.del(`/folder/${args.folder_id}`);
      return { deleted: true, folder_id: args.folder_id };
    },
  }),

  defineTool({
    name: "get_folder_views",
    description: "List the Views available on a Folder.",
    schema: z.object({ folder_id: z.string().describe("Folder ID.") }),
    handler: async (args, client) => client.get(`/folder/${args.folder_id}/view`),
  }),
];
