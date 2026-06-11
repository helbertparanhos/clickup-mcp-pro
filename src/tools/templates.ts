import { z } from "zod";
import { defineTool, teamIdParam, dateInput, toEpochMs } from "../types.js";

export const templateTools = [
  defineTool({
    name: "get_task_templates",
    description:
      "List the task templates available in a Workspace, paginated. Returns each template's id and name. Use to discover a `template_id` before creating a task from a template.",
    schema: z.object({
      team_id: teamIdParam,
      page: z.number().int().optional().describe("0-based page number for pagination. Defaults to 0 (first page)."),
    }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/taskTemplate`, {
        params: { page: args.page ?? 0 },
      }),
  }),

  defineTool({
    name: "create_task_from_template",
    description:
      "Create a new task in a List from an existing task template, copying the template's structure (subtasks, checklists, custom fields). Returns the created task. Use after `get_task_templates` to obtain the `template_id`.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("ID of the destination List where the task will be created."),
      template_id: z.string().describe("ID of the task template to instantiate (from `get_task_templates`)."),
      name: z.string().describe("Name for the new task."),
      due_date: dateInput
        .optional()
        .describe("Optional due date. Accepts natural language ('tomorrow', 'in 3 days', '+2h'), ISO date, or epoch milliseconds."),
    }),
    handler: async (args, client) => {
      const { list_id, template_id, name, due_date } = args;
      return client.post(`/list/${list_id}/taskTemplate/${template_id}`, {
        body: { name, due_date: toEpochMs(due_date) },
      });
    },
  }),
];
