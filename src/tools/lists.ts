import { z } from "zod";
import { defineTool, dateInput, toEpochMs } from "../types.js";

const listBody = z.object({
  name: z.string().optional(),
  content: z.string().optional().describe("List description."),
  due_date: dateInput.optional(),
  due_date_time: z.boolean().optional(),
  priority: z.number().int().min(1).max(4).optional().describe("1=urgent .. 4=low."),
  assignee: z.union([z.string(), z.number()]).optional().describe("Default assignee user id."),
  status: z.string().optional().describe("List color/status name."),
});

export const listTools = [
  defineTool({
    name: "get_lists_in_folder",
    description: "List all Lists inside a Folder.",
    schema: z.object({
      folder_id: z.string().describe("Folder ID."),
      archived: z.boolean().optional(),
    }),
    handler: async (args, client) =>
      client.get(`/folder/${args.folder_id}/list`, {
        params: { archived: args.archived ?? false },
      }),
  }),

  defineTool({
    name: "get_folderless_lists",
    description: "List all folderless Lists directly under a Space.",
    schema: z.object({
      space_id: z.string().describe("Space ID."),
      archived: z.boolean().optional(),
    }),
    handler: async (args, client) =>
      client.get(`/space/${args.space_id}/list`, {
        params: { archived: args.archived ?? false },
      }),
  }),

  defineTool({
    name: "get_list",
    description: "Get a single List by id.",
    schema: z.object({ list_id: z.string().describe("List ID.") }),
    handler: async (args, client) => client.get(`/list/${args.list_id}`),
  }),

  defineTool({
    name: "create_list_in_folder",
    description: "Create a List inside a Folder.",
    write: true,
    schema: z
      .object({ folder_id: z.string().describe("Folder ID."), name: z.string() })
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
    description: "Create a List directly under a Space (no Folder).",
    write: true,
    schema: z
      .object({ space_id: z.string().describe("Space ID."), name: z.string() })
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
    description: "Create a List in a Folder from a List template.",
    write: true,
    schema: z.object({
      folder_id: z.string().describe("Folder ID."),
      template_id: z.string().describe("List template ID."),
      name: z.string(),
      options: z.record(z.any()).optional(),
    }),
    handler: async (args, client) =>
      client.post(`/folder/${args.folder_id}/list_template/${args.template_id}`, {
        body: { name: args.name, options: args.options },
      }),
  }),

  defineTool({
    name: "update_list",
    description: "Update a List (name, content, due date, priority, assignee, status).",
    write: true,
    schema: z.object({ list_id: z.string().describe("List ID.") }).merge(listBody),
    handler: async (args, client) => {
      const { list_id, due_date, ...rest } = args;
      return client.put(`/list/${list_id}`, {
        body: { ...rest, due_date: toEpochMs(due_date) },
      });
    },
  }),

  defineTool({
    name: "delete_list",
    description: "Delete a List permanently.",
    write: true,
    schema: z.object({ list_id: z.string().describe("List ID.") }),
    handler: async (args, client) => {
      await client.del(`/list/${args.list_id}`);
      return { deleted: true, list_id: args.list_id };
    },
  }),

  defineTool({
    name: "get_list_views",
    description: "List the Views available on a List.",
    schema: z.object({ list_id: z.string().describe("List ID.") }),
    handler: async (args, client) => client.get(`/list/${args.list_id}/view`),
  }),
];
