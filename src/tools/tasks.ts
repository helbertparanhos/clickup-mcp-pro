import { z } from "zod";
import { defineTool, teamIdParam, dateInput, toEpochMs } from "../types.js";

/** Common query block for custom-task-id addressing. */
const idAddressing = {
  custom_task_ids: z
    .boolean()
    .optional()
    .describe("Treat task_id as a custom id (requires team_id)."),
  team_id: teamIdParam,
};

const taskWriteBody = z.object({
  name: z.string().optional(),
  description: z.string().optional().describe("Plain-text description."),
  markdown_content: z.string().optional().describe("Markdown description (overrides description)."),
  status: z.string().optional(),
  priority: z.number().int().min(1).max(4).nullable().optional().describe("1=urgent .. 4=low, null clears."),
  due_date: dateInput.optional(),
  due_date_time: z.boolean().optional(),
  start_date: dateInput.optional(),
  start_date_time: z.boolean().optional(),
  time_estimate: z.number().int().optional().describe("Estimate in milliseconds."),
  assignees: z
    .array(z.union([z.string(), z.number()]))
    .optional()
    .describe("Full set of assignee user ids. On update this REPLACES the current assignees (use assignees_add/assignees_rem for incremental changes)."),
  tags: z.array(z.string()).optional(),
  parent: z.string().optional().describe("Parent task id (makes this a subtask)."),
  custom_fields: z
    .array(z.object({ id: z.string(), value: z.any() }))
    .optional()
    .describe("Array of { id, value } custom field assignments."),
  custom_item_id: z.number().int().nullable().optional().describe("Custom task type id."),
});

function buildBody(args: Record<string, any>) {
  const body: Record<string, any> = { ...args };
  if (args.due_date !== undefined) body.due_date = toEpochMs(args.due_date);
  if (args.start_date !== undefined) body.start_date = toEpochMs(args.start_date);
  return body;
}

export const taskTools = [
  defineTool({
    name: "get_tasks",
    description:
      "Get tasks in a List with rich filtering (status, assignees, tags, due/created/updated date ranges, subtasks, custom fields). Paginated.",
    schema: z.object({
      list_id: z.string().describe("List ID."),
      archived: z.boolean().optional(),
      include_closed: z.boolean().optional(),
      page: z.number().int().optional().describe("0-based page."),
      order_by: z.enum(["created", "updated", "due_date", "id"]).optional(),
      reverse: z.boolean().optional(),
      subtasks: z.boolean().optional(),
      statuses: z.array(z.string()).optional(),
      assignees: z.array(z.union([z.string(), z.number()])).optional(),
      tags: z.array(z.string()).optional(),
      due_date_gt: dateInput.optional(),
      due_date_lt: dateInput.optional(),
      date_created_gt: dateInput.optional(),
      date_created_lt: dateInput.optional(),
      date_updated_gt: dateInput.optional(),
      date_updated_lt: dateInput.optional(),
      custom_fields: z
        .array(z.object({ field_id: z.string(), operator: z.string(), value: z.any() }))
        .optional()
        .describe("Array of custom-field filters."),
    }),
    handler: async (args, client) => {
      const { list_id, custom_fields, ...rest } = args;
      const params: Record<string, unknown> = { ...rest };
      for (const k of ["due_date_gt", "due_date_lt", "date_created_gt", "date_created_lt", "date_updated_gt", "date_updated_lt"] as const) {
        if (params[k] !== undefined) params[k] = toEpochMs(params[k] as any);
      }
      if (custom_fields) params.custom_fields = JSON.stringify(custom_fields);
      return client.get(`/list/${list_id}/task`, { params });
    },
  }),

  defineTool({
    name: "get_task",
    description: "Get a single task by id, including subtasks, custom fields and markdown.",
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      include_subtasks: z.boolean().optional(),
      include_markdown_description: z.boolean().optional(),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, ...params } = args;
      return client.get(`/task/${task_id}`, { params });
    },
  }),

  defineTool({
    name: "get_workspace_tasks",
    description:
      "Filtered/team-wide task search across the whole Workspace (filter by space/folder/list ids, statuses, assignees, tags, due dates). The deep search used when you don't know which list a task is in.",
    schema: z.object({
      team_id: teamIdParam,
      page: z.number().int().optional(),
      order_by: z.enum(["created", "updated", "due_date", "id"]).optional(),
      reverse: z.boolean().optional(),
      subtasks: z.boolean().optional(),
      include_closed: z.boolean().optional(),
      space_ids: z.array(z.string()).optional(),
      project_ids: z.array(z.string()).optional().describe("Folder ids."),
      list_ids: z.array(z.string()).optional(),
      statuses: z.array(z.string()).optional(),
      assignees: z.array(z.union([z.string(), z.number()])).optional(),
      tags: z.array(z.string()).optional(),
      due_date_gt: dateInput.optional(),
      due_date_lt: dateInput.optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, due_date_gt, due_date_lt, ...rest } = args;
      const params: Record<string, unknown> = { ...rest };
      if (due_date_gt !== undefined) params.due_date_gt = toEpochMs(due_date_gt);
      if (due_date_lt !== undefined) params.due_date_lt = toEpochMs(due_date_lt);
      return client.get(`/team/${teamId}/task`, { params });
    },
  }),

  defineTool({
    name: "create_task",
    description: "Create a task in a List.",
    write: true,
    schema: z
      .object({ list_id: z.string().describe("List ID."), name: z.string() })
      .merge(taskWriteBody.omit({ name: true }))
      .extend(idAddressing),
    handler: async (args, client) => {
      const { list_id, custom_task_ids, team_id, ...rest } = args;
      return client.post(`/list/${list_id}/task`, { body: buildBody(rest) });
    },
  }),

  defineTool({
    name: "update_task",
    description: "Update any field of a task. Pass only the fields you want to change.",
    write: true,
    schema: z
      .object({ task_id: z.string().describe("Task ID.") })
      .merge(taskWriteBody)
      .extend({
        archived: z.boolean().optional(),
        assignees_add: z.array(z.union([z.string(), z.number()])).optional().describe("Assignees to add (incremental)."),
        assignees_rem: z.array(z.union([z.string(), z.number()])).optional().describe("Assignees to remove (incremental)."),
        ...idAddressing,
      }),
    handler: async (args, client) => {
      const { task_id, custom_task_ids, team_id, assignees, assignees_add, assignees_rem, ...rest } = args;
      const body = buildBody(rest);
      const toNum = (a: string | number) => (typeof a === "string" ? Number(a) : a);

      // `assignees` = REPLACE intent: add the new set, remove any current
      // assignee not in it (ClickUp's update API is add/rem, never absolute).
      if (assignees !== undefined) {
        const current = await client.get(`/task/${task_id}`, {
          params: { custom_task_ids, team_id, include_subtasks: false },
        });
        const currentIds: number[] = (current.assignees ?? []).map((a: any) => Number(a.id));
        const nextIds = assignees.map(toNum);
        body.assignees = {
          add: nextIds,
          rem: currentIds.filter((id) => !nextIds.includes(id)),
        };
      } else if (assignees_add || assignees_rem) {
        // Incremental intent: apply add/rem as given.
        body.assignees = {
          add: (assignees_add ?? []).map(toNum),
          rem: (assignees_rem ?? []).map(toNum),
        };
      }
      return client.put(`/task/${task_id}`, {
        params: { custom_task_ids, team_id },
        body,
      });
    },
  }),

  defineTool({
    name: "delete_task",
    description: "Delete a task permanently.",
    write: true,
    schema: z.object({ task_id: z.string().describe("Task ID."), ...idAddressing }),
    handler: async (args, client) => {
      const { task_id, ...params } = args;
      await client.del(`/task/${task_id}`, { params });
      return { deleted: true, task_id };
    },
  }),

  defineTool({
    name: "get_subtasks",
    description: "Get the subtasks of a task.",
    schema: z.object({ task_id: z.string().describe("Parent task ID."), ...idAddressing }),
    handler: async (args, client) => {
      const { task_id, ...params } = args;
      return client.get(`/task/${task_id}`, {
        params: { ...params, include_subtasks: true },
      });
    },
  }),

  defineTool({
    name: "duplicate_task",
    description:
      "Duplicate a task into a target List by reading it and re-creating it (name, description, status, priority, assignees, tags, dates).",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Source task ID."),
      list_id: z.string().describe("Destination List ID."),
      name: z.string().optional().describe("Override name (defaults to '<name> (copy)')."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const src = await client.get(`/task/${args.task_id}`, {
        params: { custom_task_ids: args.custom_task_ids, team_id: args.team_id },
      });
      const body: Record<string, any> = {
        name: args.name ?? `${src.name} (copy)`,
        description: src.description,
        status: src.status?.status,
        priority: src.priority?.id ? Number(src.priority.id) : undefined,
        due_date: src.due_date ? Number(src.due_date) : undefined,
        start_date: src.start_date ? Number(src.start_date) : undefined,
        assignees: (src.assignees ?? []).map((a: any) => a.id),
        tags: (src.tags ?? []).map((t: any) => t.name),
      };
      return client.post(`/list/${args.list_id}/task`, { body });
    },
  }),

  defineTool({
    name: "set_task_custom_field_value",
    description: "Set the value of a custom field on a task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      field_id: z.string().describe("Custom field ID."),
      value: z.any().describe("New value (shape depends on field type)."),
      value_options: z.record(z.any()).optional(),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, field_id, value, value_options, custom_task_ids, team_id } = args;
      return client.post(`/task/${task_id}/field/${field_id}`, {
        params: { custom_task_ids, team_id },
        body: { value, value_options },
      });
    },
  }),

  defineTool({
    name: "remove_task_custom_field_value",
    description: "Clear/remove a custom field value from a task.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      field_id: z.string().describe("Custom field ID."),
      ...idAddressing,
    }),
    handler: async (args, client) => {
      const { task_id, field_id, custom_task_ids, team_id } = args;
      await client.del(`/task/${task_id}/field/${field_id}`, {
        params: { custom_task_ids, team_id },
      });
      return { removed: true, task_id, field_id };
    },
  }),

  defineTool({
    name: "get_task_members",
    description: "List the members who have access to a task.",
    schema: z.object({ task_id: z.string().describe("Task ID.") }),
    handler: async (args, client) => client.get(`/task/${args.task_id}/member`),
  }),
];
