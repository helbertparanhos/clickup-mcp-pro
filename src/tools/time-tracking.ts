import { z } from "zod";
import { defineTool, teamIdParam, dateInput, toEpochMs } from "../types.js";

export const timeTrackingTools = [
  defineTool({
    name: "get_time_entries",
    description:
      "List time entries in a Workspace within a date range, optionally filtered by assignee, task, List, Folder or Space. Returns each entry's id, duration, user, task and billable flag. Use to build timesheets or audit logged time.",
    schema: z.object({
      team_id: teamIdParam,
      start_date: dateInput.optional().describe("Start of the date range (natural language, ISO, or epoch ms). Omit for the default window."),
      end_date: dateInput.optional().describe("End of the date range (natural language, ISO, or epoch ms)."),
      assignee: z
        .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
        .optional()
        .describe("A single user id or an array of user ids to filter entries by."),
      include_task_tags: z.boolean().optional().describe("If true, include each task's tags in the result."),
      include_location_names: z.boolean().optional().describe("If true, include the List/Folder/Space names for each entry."),
      task_id: z.string().optional().describe("Only return entries logged against this task id."),
      list_id: z.string().optional().describe("Only return entries for tasks in this List id."),
      folder_id: z.string().optional().describe("Only return entries for tasks in this Folder id."),
      space_id: z.string().optional().describe("Only return entries for tasks in this Space id."),
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
    description:
      "Get a single time entry by id, including its duration, start, user, task and tags. Use to inspect one logged interval.",
    schema: z.object({ team_id: teamIdParam, timer_id: z.string().describe("ID of the time entry to fetch.") }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/time_entries/${args.timer_id}`),
  }),

  defineTool({
    name: "get_running_time_entry",
    description:
      "Get the timer that is currently running for a user (defaults to the token owner). Returns the active entry or empty if no timer is running. Use to check whether a timer is on before starting/stopping.",
    schema: z.object({
      team_id: teamIdParam,
      assignee: z.union([z.string(), z.number()]).optional().describe("User id to check. Omit to check the token owner's running timer."),
    }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/time_entries/current`, {
        params: { assignee: args.assignee },
      }),
  }),

  defineTool({
    name: "start_time_entry",
    description:
      "Start a live timer for the token owner, optionally bound to a task and marked billable. Returns the started entry. Stop it later with `stop_time_entry`.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      task_id: z.string().optional().describe("Task id to bind the timer to. Omit for an untied timer."),
      description: z.string().optional().describe("Optional note describing what is being worked on."),
      tags: z.array(z.any()).optional().describe("Array of time-entry tag objects to attach, e.g. [{ name, tag_fg, tag_bg }]."),
      billable: z.boolean().optional().describe("If true, mark the logged time as billable."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/team/${teamId}/time_entries/start`, { body });
    },
  }),

  defineTool({
    name: "stop_time_entry",
    description:
      "Stop the timer currently running for the token owner and persist the logged interval. Returns the completed entry. No-op error if no timer is running.",
    write: true,
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.post(`/team/${client.resolveTeamId(args.team_id)}/time_entries/stop`, {}),
  }),

  defineTool({
    name: "create_time_entry",
    description:
      "Create a manual time entry with an explicit start time and duration (no live timer needed). Optionally tie it to a task, user, billable flag and tags. Returns the created entry. Use to log time after the fact.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      start: dateInput.describe("Start time of the interval (natural language, ISO, or epoch ms)."),
      duration: z.number().int().describe("Length of the interval in milliseconds."),
      task_id: z.string().optional().describe("Task id to log the time against."),
      description: z.string().optional().describe("Optional note describing the work."),
      billable: z.boolean().optional().describe("If true, mark the time as billable."),
      assignee: z.union([z.string(), z.number()]).optional().describe("User id the entry belongs to (defaults to the token owner)."),
      tags: z.array(z.any()).optional().describe("Array of time-entry tag objects to attach."),
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
    description:
      "Update an existing time entry — change its description, start, duration, billable flag, tags or linked task. Only the provided fields change. Returns the updated entry.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      timer_id: z.string().describe("ID of the time entry to update."),
      description: z.string().optional().describe("New note. Omit to keep current."),
      start: dateInput.optional().describe("New start time (natural language, ISO, or epoch ms)."),
      duration: z.number().int().optional().describe("New duration in milliseconds."),
      billable: z.boolean().optional().describe("Set true/false to change the billable flag."),
      tags: z.array(z.any()).optional().describe("Replacement array of time-entry tag objects."),
      task_id: z.string().optional().describe("New task id to associate the entry with."),
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
    description:
      "Permanently delete a time entry by id. This cannot be undone. Returns a confirmation with the deleted entry id.",
    write: true,
    schema: z.object({ team_id: teamIdParam, timer_id: z.string().describe("ID of the time entry to delete.") }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      await client.del(`/team/${teamId}/time_entries/${args.timer_id}`);
      return { deleted: true, timer_id: args.timer_id };
    },
  }),

  defineTool({
    name: "get_time_entry_history",
    description:
      "Get the change history of a time entry — who edited it and what changed over time. Use to audit edits to logged time.",
    schema: z.object({ team_id: teamIdParam, timer_id: z.string().describe("ID of the time entry whose history to fetch.") }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/time_entries/${args.timer_id}/history`),
  }),

  defineTool({
    name: "get_all_time_entry_tags",
    description:
      "List all time-entry tags defined in a Workspace, with their names and colors. Use to discover available tags before tagging entries.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/time_entries/tags`),
  }),

  defineTool({
    name: "add_tags_to_time_entries",
    description:
      "Add one or more tags to one or more time entries at once. Returns a confirmation. Use to categorize logged time (e.g. 'billable', 'meeting').",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      time_entry_ids: z.array(z.string()).min(1).describe("IDs of the time entries to tag."),
      tags: z.array(z.any()).min(1).describe("Array of tag objects to add, e.g. [{ name, tag_fg, tag_bg }]."),
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
    description:
      "Remove one or more tags from one or more time entries at once. Returns a confirmation.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      time_entry_ids: z.array(z.string()).min(1).describe("IDs of the time entries to untag."),
      tags: z.array(z.any()).min(1).describe("Array of tag objects to remove (matched by name)."),
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
    description:
      "Get how long a single task has spent in each of its statuses, plus the current status duration. Use to analyze cycle time or where a task is stuck.",
    schema: z.object({
      task_id: z.string().describe("ID of the task to analyze."),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe("Set true when `task_id` is a custom task ID instead of a native ClickUp ID. Requires team_id."),
      team_id: teamIdParam,
    }),
    handler: async (args, client) => {
      const { task_id, ...params } = args;
      return client.get(`/task/${task_id}/time_in_status`, { params });
    },
  }),

  defineTool({
    name: "get_bulk_tasks_time_in_status",
    description:
      "Get time-in-status data for multiple tasks in one call. Returns per-task status durations. Use to compare cycle time across a set of tasks.",
    schema: z.object({
      task_ids: z.array(z.string()).min(1).describe("IDs of the tasks to analyze."),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe("Set true when task_ids are custom task IDs instead of native ClickUp IDs. Requires team_id."),
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
