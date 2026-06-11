import { z } from "zod";
import { defineTool, teamIdParam, dateInput, toEpochMs } from "../types.js";

export const goalTools = [
  defineTool({
    name: "get_goals",
    description:
      "List the Goals in a Workspace, with each Goal's id, name, due date, owners and progress. Goals track outcomes via key results. Use to find a `goal_id`.",
    schema: z.object({
      team_id: teamIdParam,
      include_completed: z.boolean().optional().describe("If true, also include completed/archived Goals. Defaults to false."),
    }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/goal`, {
        params: { include_completed: args.include_completed },
      }),
  }),

  defineTool({
    name: "get_goal",
    description:
      "Get a single Goal by id, including its key results (targets) and current progress. Use to inspect a Goal's details and its key_result ids.",
    schema: z.object({ goal_id: z.string().describe("ID of the Goal to fetch.") }),
    handler: async (args, client) => client.get(`/goal/${args.goal_id}`),
  }),

  defineTool({
    name: "create_goal",
    description:
      "Create a new Goal in a Workspace with optional due date, description, owners and color. Returns the created Goal with its id. Add measurable targets afterwards with `create_key_result`.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string().describe("Name/title of the Goal."),
      due_date: dateInput
        .optional()
        .describe("Target/due date. Accepts natural language ('next friday'), ISO date, or epoch milliseconds."),
      description: z.string().optional().describe("Optional description of what the Goal aims to achieve."),
      multiple_owners: z.boolean().optional().describe("If true, allow more than one owner on the Goal."),
      owners: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe("User ids to set as the Goal's owners."),
      color: z.string().optional().describe("Accent color for the Goal as a hex string, e.g. #2ecd6f."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, due_date, ...rest } = args;
      return client.post(`/team/${teamId}/goal`, {
        body: { ...rest, due_date: toEpochMs(due_date) },
      });
    },
  }),

  defineTool({
    name: "update_goal",
    description:
      "Update a Goal — change its name, due date, description, color, and add/remove owners. Only the provided fields change. Returns the updated Goal.",
    write: true,
    schema: z.object({
      goal_id: z.string().describe("ID of the Goal to update."),
      name: z.string().optional().describe("New name. Omit to keep the current name."),
      due_date: dateInput
        .optional()
        .describe("New due date (natural language, ISO, or epoch ms). Omit to keep current."),
      description: z.string().optional().describe("New description. Omit to keep current."),
      rem_owners: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe("User ids to remove from the Goal's owners."),
      add_owners: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe("User ids to add to the Goal's owners."),
      color: z.string().optional().describe("New accent color as a hex string."),
    }),
    handler: async (args, client) => {
      const { goal_id, due_date, ...rest } = args;
      return client.put(`/goal/${goal_id}`, {
        body: { ...rest, due_date: toEpochMs(due_date) },
      });
    },
  }),

  defineTool({
    name: "delete_goal",
    description:
      "Permanently delete a Goal and its key results. This cannot be undone. Returns a confirmation with the deleted Goal id.",
    write: true,
    schema: z.object({ goal_id: z.string().describe("ID of the Goal to delete.") }),
    handler: async (args, client) => {
      await client.del(`/goal/${args.goal_id}`);
      return { deleted: true, goal_id: args.goal_id };
    },
  }),

  defineTool({
    name: "create_key_result",
    description:
      "Add a key result (a measurable target) to a Goal. Choose its measurement `type` and, for numeric types, the start/end steps and unit. Can be tied to tasks or Lists for automatic tracking. Returns the created key result.",
    write: true,
    schema: z.object({
      goal_id: z.string().describe("ID of the Goal to add the key result to."),
      name: z.string().describe("Name of the key result (what is being measured)."),
      type: z
        .enum(["number", "currency", "boolean", "percentage", "automatic"])
        .describe("Measurement type: 'number', 'currency', 'boolean' (done/not done), 'percentage', or 'automatic' (tracked from tasks/lists)."),
      steps_start: z.number().optional().describe("Starting value for numeric/currency/percentage types."),
      steps_end: z.number().optional().describe("Target value to reach for numeric/currency/percentage types."),
      unit: z.string().optional().describe("Unit label for the measurement, e.g. 'tasks', '$', '%'."),
      owners: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe("User ids responsible for this key result."),
      task_ids: z.array(z.string()).optional().describe("Task ids to tie the key result to (for 'automatic' tracking)."),
      list_ids: z.array(z.string()).optional().describe("List ids to tie the key result to (for 'automatic' tracking)."),
    }),
    handler: async (args, client) => {
      const { goal_id, ...body } = args;
      return client.post(`/goal/${goal_id}/key_result`, { body });
    },
  }),

  defineTool({
    name: "update_key_result",
    description:
      "Update a key result's current progress and/or definition — set the latest value, add a note, or rename it. Only the provided fields change. Returns the updated key result.",
    write: true,
    schema: z.object({
      key_result_id: z.string().describe("ID of the key result to update."),
      steps_current: z.number().optional().describe("The latest measured value, used to compute progress toward the target."),
      note: z.string().optional().describe("Optional note describing this progress update."),
      name: z.string().optional().describe("New name for the key result. Omit to keep current."),
    }),
    handler: async (args, client) => {
      const { key_result_id, ...body } = args;
      return client.put(`/key_result/${key_result_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_key_result",
    description:
      "Permanently delete a key result from its Goal. This cannot be undone. Returns a confirmation with the deleted key result id.",
    write: true,
    schema: z.object({ key_result_id: z.string().describe("ID of the key result to delete.") }),
    handler: async (args, client) => {
      await client.del(`/key_result/${args.key_result_id}`);
      return { deleted: true, key_result_id: args.key_result_id };
    },
  }),
];
