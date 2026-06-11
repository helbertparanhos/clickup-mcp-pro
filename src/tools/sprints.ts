import { z } from "zod";
import { defineTool } from "../types.js";

/**
 * ClickUp models Sprints as Lists inside a Sprint Folder. There is no dedicated
 * Sprint API, so these tools operate over the Folder → List → Task hierarchy.
 */
export const sprintTools = [
  defineTool({
    name: "list_sprints",
    description:
      "List the sprints (Lists) inside a Sprint Folder, including their start/due dates.",
    schema: z.object({ folder_id: z.string().describe("Sprint Folder ID.") }),
    handler: async (args, client) => {
      const folder = await client.get(`/folder/${args.folder_id}`);
      const sprints = (folder.lists ?? []).map((l: any) => ({
        id: l.id,
        name: l.name,
        start_date: l.start_date,
        due_date: l.due_date,
        task_count: l.task_count,
      }));
      return { folder_id: args.folder_id, folder_name: folder.name, sprints };
    },
  }),

  defineTool({
    name: "get_active_sprint",
    description:
      "Find the currently active sprint in a Sprint Folder — the List whose start/due date range contains now.",
    schema: z.object({ folder_id: z.string().describe("Sprint Folder ID.") }),
    handler: async (args, client) => {
      const folder = await client.get(`/folder/${args.folder_id}`);
      const now = Date.now();
      const active = (folder.lists ?? []).find((l: any) => {
        const start = l.start_date ? Number(l.start_date) : undefined;
        const due = l.due_date ? Number(l.due_date) : undefined;
        if (start && due) return now >= start && now <= due;
        return false;
      });
      if (!active)
        return { active_sprint: null, hint: "No sprint's date range contains the current time." };
      return { active_sprint: active };
    },
  }),

  defineTool({
    name: "get_sprint_tasks",
    description:
      "Get the tasks of a sprint, i.e. the tasks contained in the sprint's List. Returns the task list with status, assignees and dates. Use to review sprint scope or progress.",
    schema: z.object({
      sprint_list_id: z.string().describe("ID of the sprint List (from `list_sprints` or `get_active_sprint`)."),
      include_closed: z
        .boolean()
        .optional()
        .describe("If true, also include closed/done tasks. Defaults to false (open tasks only)."),
      subtasks: z.boolean().optional().describe("If true, include subtasks in the result."),
    }),
    handler: async (args, client) =>
      client.get(`/list/${args.sprint_list_id}/task`, {
        params: { include_closed: args.include_closed, subtasks: args.subtasks },
      }),
  }),
];
