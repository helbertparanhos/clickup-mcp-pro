import { z } from "zod";
import { defineTool, teamIdParam, dateInput, toEpochMs } from "../types.js";

export const templateTools = [
  defineTool({
    name: "get_task_templates",
    description: "List the task templates available in a Workspace (paginated).",
    schema: z.object({
      team_id: teamIdParam,
      page: z.number().int().optional().describe("0-based page. Default 0."),
    }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/taskTemplate`, {
        params: { page: args.page ?? 0 },
      }),
  }),

  defineTool({
    name: "create_task_from_template",
    description: "Create a new task in a List from a task template.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("Destination List ID."),
      template_id: z.string().describe("Task template ID."),
      name: z.string().describe("New task name."),
      due_date: dateInput.optional(),
    }),
    handler: async (args, client) => {
      const { list_id, template_id, name, due_date } = args;
      return client.post(`/list/${list_id}/taskTemplate/${template_id}`, {
        body: { name, due_date: toEpochMs(due_date) },
      });
    },
  }),
];
