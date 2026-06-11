import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const idAddressing = {
  custom_task_ids: z
    .boolean()
    .optional()
    .describe("Set true when the task ids are custom task IDs instead of native ClickUp IDs. Requires `team_id`."),
  team_id: teamIdParam,
};

export const taskLinkTools = [
  defineTool({
    name: "add_task_link",
    description:
      "Link two tasks together with a plain (non-dependency) relationship, so they reference each other. Use for 'related to' connections that don't imply blocking order. Returns the linked task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the source task."),
      links_to: z.string().describe("ID of the task to link it to."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, links_to, ...params } = args;
      return client.post(`/task/${task_id}/link/${links_to}`, { params });
    },
  }),

  defineTool({
    name: "delete_task_link",
    description:
      "Remove a plain link between two tasks (created by `add_task_link`). Returns a confirmation. Does not affect dependencies.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the source task."),
      links_to: z.string().describe("ID of the linked task to unlink."),
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
      "Create a blocking dependency between tasks. Provide `depends_on` to make this task wait on another (this is blocked until that finishes), or `dependency_of` to make this task block another. Exactly one is required. Returns a confirmation.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task the dependency is anchored on."),
      depends_on: z
        .string()
        .optional()
        .describe("ID of the task that THIS task waits for (this task is blocked until that one completes)."),
      dependency_of: z
        .string()
        .optional()
        .describe("ID of the task that depends on THIS task (that task is blocked until this one completes)."),
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
    description:
      "Remove a blocking dependency between tasks. Provide the same `depends_on` or `dependency_of` used to create it (exactly one is required). Returns a confirmation.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task the dependency is anchored on."),
      depends_on: z.string().optional().describe("ID of the task THIS task was waiting for, to remove that link."),
      dependency_of: z.string().optional().describe("ID of the task that depended on THIS task, to remove that link."),
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
    description:
      "Add an existing task to an additional List (ClickUp's 'Tasks in Multiple Lists' feature), so it appears in more than one List without being moved. Returns a confirmation.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to add."),
      list_id: z.string().describe("ID of the additional List to add the task to."),
    }),
    handler: async (args, client) => {
      await client.post(`/list/${args.list_id}/task/${args.task_id}`, {});
      return { added: true, task_id: args.task_id, list_id: args.list_id };
    },
  }),

  defineTool({
    name: "remove_task_from_list",
    description:
      "Remove a task from an additional List it was added to via 'Tasks in Multiple Lists'. The task remains in its home List. Returns a confirmation.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to remove."),
      list_id: z.string().describe("ID of the additional List to remove the task from."),
    }),
    handler: async (args, client) => {
      await client.del(`/list/${args.list_id}/task/${args.task_id}`, {});
      return { removed: true, task_id: args.task_id, list_id: args.list_id };
    },
  }),
];
