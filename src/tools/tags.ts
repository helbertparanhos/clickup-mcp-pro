import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z
    .boolean()
    .optional()
    .describe("Set true when `task_id` is a custom task ID instead of a native ClickUp ID. Requires `team_id`."),
  team_id: teamIdParam,
};

const tagShape = {
  name: z.string().describe("Tag name (case-sensitive; used as the tag's identifier within the Space)."),
  tag_fg: z.string().optional().describe("Foreground (text) color as a hex string, e.g. #ffffff."),
  tag_bg: z.string().optional().describe("Background color as a hex string, e.g. #ff0000."),
};

export const tagTools = [
  defineTool({
    name: "get_space_tags",
    description:
      "List all tags defined in a Space, with each tag's name and colors. Tags live at the Space level and can be applied to any task in it. Use to discover available tag names before tagging a task.",
    schema: z.object({ space_id: z.string().describe("ID of the Space to read tags from.") }),
    handler: async (args, client) => client.get(`/space/${args.space_id}/tag`),
  }),

  defineTool({
    name: "create_space_tag",
    description:
      "Create a new tag in a Space with optional foreground/background colors. The tag becomes available to all tasks in the Space. Returns the created tag.",
    write: true,
    schema: z.object({ space_id: z.string().describe("ID of the Space to create the tag in."), ...tagShape }),
    handler: async (args, client) => {
      const { space_id, ...tag } = args;
      return client.post(`/space/${space_id}/tag`, { body: { tag } });
    },
  }),

  defineTool({
    name: "update_space_tag",
    description:
      "Update an existing Space tag — rename it and/or change its colors. Identify it by its current name. Returns the updated tag.",
    write: true,
    schema: z.object({
      space_id: z.string().describe("ID of the Space the tag belongs to."),
      tag_name: z.string().describe("Current name of the tag to update."),
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
    description:
      "Delete a tag from a Space by name, removing it from every task it was applied to. This cannot be undone. Returns a confirmation with the deleted tag name.",
    write: true,
    schema: z.object({
      space_id: z.string().describe("ID of the Space the tag belongs to."),
      tag_name: z.string().describe("Name of the tag to delete."),
    }),
    handler: async (args, client) => {
      await client.del(`/space/${args.space_id}/tag/${encodeURIComponent(args.tag_name)}`);
      return { deleted: true, tag_name: args.tag_name };
    },
  }),

  defineTool({
    name: "add_tag_to_task",
    description:
      "Apply an existing Space tag to a task. The tag must already exist in the task's Space (create it first with `create_space_tag` if needed). Returns a confirmation.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to tag."),
      tag_name: z.string().describe("Name of the existing Space tag to apply."),
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
    description:
      "Remove a tag from a task without deleting the tag from the Space. Returns a confirmation. Use to untag a single task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to untag."),
      tag_name: z.string().describe("Name of the tag to remove from the task."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, tag_name, ...params } = args;
      await client.del(`/task/${task_id}/tag/${encodeURIComponent(tag_name)}`, { params });
      return { removed: true, task_id, tag_name };
    },
  }),
];
