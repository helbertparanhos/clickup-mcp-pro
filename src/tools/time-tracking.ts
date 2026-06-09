import { z } from "zod";
import { defineTool, teamIdParam, dateInput, toEpochMs } from "../types.js";

export const timeTrackingTools = [
  defineTool({
    name: "get_time_entries",
    description:
      "List time entries in a Workspace within a date range, optionally filtered by assignee, task, list, folder or space.",
    schema: z.object({
      team_id: teamIdParam,
      start_date: dateInput.optional(),
      end_date: dateInput.optional(),
      assignee: z
        .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
        .optional()
        .describe("User id, or an array of user ids, to filter by."),
      include_task_tags: z.boolean().optional(),
      include_location_names: z.boolean().optional(),
      task_id: z.string().optional(),
      list_id: z.string().optional(),
      folder_id: z.string().optional(),
      space_id: z.string().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, start_date, end_date, assignee, ...rest } = args;
      return client.get(`/team/${teamId}/time_entries`, {
        params: {
          ...rest,
          assignee: Array.isArray(assignee) ? assignee.join(",") : assignee,
          start_date: toEpochMs(start_date),
          end_date: toEpochMs(end_date),
        },
      });
    },
  }),

  defineTool({
    name: "get_time_entry",
    description: "Get a single time entry by id.",
    schema: z.object({ team_id: teamIdParam, timer_id: z.string().describe("Time entry ID.") }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/time_entries/${args.timer_id}`),
  }),

  defineTool({
    name: "get_running_time_entry",
    description: "Get the currently running timer for a user (or the token owner).",
    schema: z.object({
      team_id: teamIdParam,
      assignee: z.union([z.string(), z.number()]).optional(),
    }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/time_entries/current`, {
        params: { assignee: args.assignee },
      }),
  }),

  defineTool({
    name: "start_time_entry",
    description: "Start a timer, optionally bound to a task.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      task_id: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.any()).optional().describe("Array of time-entry tag objects."),
      billable: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/team/${teamId}/time_entries/start`, { body });
    },
  }),

  defineTool({
    name: "stop_time_entry",
    description: "Stop the currently running timer.",
    write: true,
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.post(`/team/${client.resolveTeamId(args.team_id)}/time_entries/stop`, {}),
  }),

  defineTool({
    name: "create_time_entry",
    description: "Create a manual time entry (with explicit start and duration).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      start: dateInput.describe("Start time."),
      duration: z.number().int().describe("Duration in milliseconds."),
      task_id: z.string().optional(),
      description: z.string().optional(),
      billable: z.boolean().optional(),
      assignee: z.union([z.string(), z.number()]).optional(),
      tags: z.array(z.any()).optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, start, ...rest } = args;
      return client.post(`/team/${teamId}/time_entries`, {
        body: { ...rest, start: toEpochMs(start) },
      });
    },
  }),

  defineTool({
    name: "update_time_entry",
    description: "Update a time entry (description, duration, start, billable, tags).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      timer_id: z.string().describe("Time entry ID."),
      description: z.string().optional(),
      start: dateInput.optional(),
      duration: z.number().int().optional(),
      billable: z.boolean().optional(),
      tags: z.array(z.any()).optional(),
      task_id: z.string().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, timer_id, start, ...rest } = args;
      return client.put(`/team/${teamId}/time_entries/${timer_id}`, {
        body: { ...rest, start: toEpochMs(start) },
      });
    },
  }),

  defineTool({
    name: "delete_time_entry",
    description: "Delete a time entry.",
    write: true,
    schema: z.object({ team_id: teamIdParam, timer_id: z.string().describe("Time entry ID.") }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      await client.del(`/team/${teamId}/time_entries/${args.timer_id}`);
      return { deleted: true, timer_id: args.timer_id };
    },
  }),

  defineTool({
    name: "get_time_entry_history",
    description: "Get the change history of a time entry.",
    schema: z.object({ team_id: teamIdParam, timer_id: z.string().describe("Time entry ID.") }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/time_entries/${args.timer_id}/history`),
  }),

  defineTool({
    name: "get_all_time_entry_tags",
    description: "List all time-entry tags used in a Workspace.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/time_entries/tags`),
  }),

  defineTool({
    name: "add_tags_to_time_entries",
    description: "Add tags to one or more time entries.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      time_entry_ids: z.array(z.string()).min(1),
      tags: z.array(z.any()).min(1).describe("Array of tag objects { name, tag_fg, tag_bg }."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      return client.post(`/team/${teamId}/time_entries/tags`, {
        body: { time_entry_ids: args.time_entry_ids, tags: args.tags },
      });
    },
  }),

  defineTool({
    name: "remove_tags_from_time_entries",
    description: "Remove tags from one or more time entries.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      time_entry_ids: z.array(z.string()).min(1),
      tags: z.array(z.any()).min(1),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      await client.del(`/team/${teamId}/time_entries/tags`, {
        body: { time_entry_ids: args.time_entry_ids, tags: args.tags },
      });
      return { removed: true };
    },
  }),

  defineTool({
    name: "get_task_time_in_status",
    description: "Get how long a task has spent in each status.",
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      custom_task_ids: z.boolean().optional(),
      team_id: teamIdParam,
    }),
    handler: async (args, client) => {
      const { task_id, ...params } = args;
      return client.get(`/task/${task_id}/time_in_status`, { params });
    },
  }),

  defineTool({
    name: "get_bulk_tasks_time_in_status",
    description: "Get time-in-status for multiple tasks at once.",
    schema: z.object({
      task_ids: z.array(z.string()).min(1).describe("Task IDs."),
      custom_task_ids: z.boolean().optional(),
      team_id: teamIdParam,
    }),
    handler: async (args, client) => {
      const { task_ids, ...rest } = args;
      return client.get(`/task/bulk_time_in_status/task_ids`, {
        params: { task_ids, ...rest },
      });
    },
  }),
];
