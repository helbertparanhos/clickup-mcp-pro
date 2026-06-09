import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z.boolean().optional(),
  team_id: teamIdParam,
};

export const taskLinkTools = [
  defineTool({
    name: "add_task_link",
    description: "Link two tasks together (non-dependency relationship).",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      links_to: z.string().describe("Task ID to link to."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, links_to, ...params } = args;
      return client.post(`/task/${task_id}/link/${links_to}`, { params });
    },
  }),

  defineTool({
    name: "delete_task_link",
    description: "Remove a link between two tasks.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      links_to: z.string().describe("Linked task ID to remove."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, links_to, ...params } = args;
      await client.del(`/task/${task_id}/link/${links_to}`, { params });
      return { unlinked: true, task_id, links_to };
    },
  }),

  defineTool({
    name: "add_task_dependency",
    description:
      "Create a dependency between tasks. Provide either depends_on (this task waits on it) or dependency_of (this task blocks it).",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      depends_on: z.string().optional().describe("Task this one depends on (waits for)."),
      dependency_of: z.string().optional().describe("Task that depends on this one (is blocked by it)."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, depends_on, dependency_of, custom_task_ids, team_id } = args;
      if (!depends_on && !dependency_of)
        throw new Error("Provide either depends_on or dependency_of.");
      return client.post(`/task/${task_id}/dependency`, {
        params: { custom_task_ids, team_id },
        body: { depends_on, dependency_of },
      });
    },
  }),

  defineTool({
    name: "delete_task_dependency",
    description: "Remove a dependency between tasks.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      depends_on: z.string().optional(),
      dependency_of: z.string().optional(),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, depends_on, dependency_of, custom_task_ids, team_id } = args;
      if (!depends_on && !dependency_of)
        throw new Error("Provide either depends_on or dependency_of.");
      await client.del(`/task/${task_id}/dependency`, {
        params: { depends_on, dependency_of, custom_task_ids, team_id },
      });
      return { removed: true, task_id };
    },
  }),

  defineTool({
    name: "add_task_to_list",
    description: "Add an existing task to an additional List (multi-list / 'Tasks in Multiple Lists').",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      list_id: z.string().describe("List ID to add the task to."),
    }),
    handler: async (args, client) => {
      await client.post(`/list/${args.list_id}/task/${args.task_id}`, {});
      return { added: true, task_id: args.task_id, list_id: args.list_id };
    },
  }),

  defineTool({
    name: "remove_task_from_list",
    description: "Remove a task from an additional List (multi-list association).",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      list_id: z.string().describe("List ID to remove the task from."),
    }),
    handler: async (args, client) => {
      await client.del(`/list/${args.list_id}/task/${args.task_id}`, {});
      return { removed: true, task_id: args.task_id, list_id: args.list_id };
    },
  }),
];
