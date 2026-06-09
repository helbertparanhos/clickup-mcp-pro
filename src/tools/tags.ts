import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z.boolean().optional(),
  team_id: teamIdParam,
};

const tagShape = {
  name: z.string().describe("Tag name."),
  tag_fg: z.string().optional().describe("Foreground hex color, e.g. #ffffff."),
  tag_bg: z.string().optional().describe("Background hex color, e.g. #ff0000."),
};

export const tagTools = [
  defineTool({
    name: "get_space_tags",
    description: "List all tags defined in a Space.",
    schema: z.object({ space_id: z.string().describe("Space ID.") }),
    handler: async (args, client) => client.get(`/space/${args.space_id}/tag`),
  }),

  defineTool({
    name: "create_space_tag",
    description: "Create a new tag in a Space.",
    write: true,
    schema: z.object({ space_id: z.string().describe("Space ID."), ...tagShape }),
    handler: async (args, client) => {
      const { space_id, ...tag } = args;
      return client.post(`/space/${space_id}/tag`, { body: { tag } });
    },
  }),

  defineTool({
    name: "update_space_tag",
    description: "Update an existing Space tag (rename / recolor).",
    write: true,
    schema: z.object({
      space_id: z.string().describe("Space ID."),
      tag_name: z.string().describe("Current tag name."),
      ...tagShape,
    }),
    handler: async (args, client) => {
      const { space_id, tag_name, ...tag } = args;
      return client.put(`/space/${space_id}/tag/${encodeURIComponent(tag_name)}`, {
        body: { tag },
      });
    },
  }),

  defineTool({
    name: "delete_space_tag",
    description: "Delete a tag from a Space.",
    write: true,
    schema: z.object({
      space_id: z.string().describe("Space ID."),
      tag_name: z.string().describe("Tag name to delete."),
    }),
    handler: async (args, client) => {
      await client.del(`/space/${args.space_id}/tag/${encodeURIComponent(args.tag_name)}`);
      return { deleted: true, tag_name: args.tag_name };
    },
  }),

  defineTool({
    name: "add_tag_to_task",
    description: "Add an existing tag to a task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      tag_name: z.string().describe("Tag name."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, tag_name, ...params } = args;
      await client.post(`/task/${task_id}/tag/${encodeURIComponent(tag_name)}`, { params });
      return { added: true, task_id, tag_name };
    },
  }),

  defineTool({
    name: "remove_tag_from_task",
    description: "Remove a tag from a task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      tag_name: z.string().describe("Tag name."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, tag_name, ...params } = args;
      await client.del(`/task/${task_id}/tag/${encodeURIComponent(tag_name)}`, { params });
      return { removed: true, task_id, tag_name };
    },
  }),
];
