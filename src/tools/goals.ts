import { z } from "zod";
import { defineTool, teamIdParam, dateInput, toEpochMs } from "../types.js";

export const goalTools = [
  defineTool({
    name: "get_goals",
    description: "List Goals in a Workspace.",
    schema: z.object({
      team_id: teamIdParam,
      include_completed: z.boolean().optional(),
    }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/goal`, {
        params: { include_completed: args.include_completed },
      }),
  }),

  defineTool({
    name: "get_goal",
    description: "Get a single Goal (with its key results) by id.",
    schema: z.object({ goal_id: z.string().describe("Goal ID.") }),
    handler: async (args, client) => client.get(`/goal/${args.goal_id}`),
  }),

  defineTool({
    name: "create_goal",
    description: "Create a Goal in a Workspace.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string(),
      due_date: dateInput.optional(),
      description: z.string().optional(),
      multiple_owners: z.boolean().optional(),
      owners: z.array(z.union([z.string(), z.number()])).optional().describe("Owner user ids."),
      color: z.string().optional().describe("Hex color."),
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
    description: "Update a Goal (name, due date, description, owners, color).",
    write: true,
    schema: z.object({
      goal_id: z.string().describe("Goal ID."),
      name: z.string().optional(),
      due_date: dateInput.optional(),
      description: z.string().optional(),
      rem_owners: z.array(z.union([z.string(), z.number()])).optional(),
      add_owners: z.array(z.union([z.string(), z.number()])).optional(),
      color: z.string().optional(),
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
    description: "Delete a Goal.",
    write: true,
    schema: z.object({ goal_id: z.string().describe("Goal ID.") }),
    handler: async (args, client) => {
      await client.del(`/goal/${args.goal_id}`);
      return { deleted: true, goal_id: args.goal_id };
    },
  }),

  defineTool({
    name: "create_key_result",
    description: "Add a key result (target) to a Goal.",
    write: true,
    schema: z.object({
      goal_id: z.string().describe("Goal ID."),
      name: z.string(),
      type: z.enum(["number", "currency", "boolean", "percentage", "automatic"]),
      steps_start: z.number().optional(),
      steps_end: z.number().optional(),
      unit: z.string().optional(),
      owners: z.array(z.union([z.string(), z.number()])).optional(),
      task_ids: z.array(z.string()).optional(),
      list_ids: z.array(z.string()).optional(),
    }),
    handler: async (args, client) => {
      const { goal_id, ...body } = args;
      return client.post(`/goal/${goal_id}/key_result`, { body });
    },
  }),

  defineTool({
    name: "update_key_result",
    description: "Update a key result's progress or definition.",
    write: true,
    schema: z.object({
      key_result_id: z.string().describe("Key result ID."),
      steps_current: z.number().optional(),
      note: z.string().optional(),
      name: z.string().optional(),
    }),
    handler: async (args, client) => {
      const { key_result_id, ...body } = args;
      return client.put(`/key_result/${key_result_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_key_result",
    description: "Delete a key result.",
    write: true,
    schema: z.object({ key_result_id: z.string().describe("Key result ID.") }),
    handler: async (args, client) => {
      await client.del(`/key_result/${args.key_result_id}`);
      return { deleted: true, key_result_id: args.key_result_id };
    },
  }),
];
