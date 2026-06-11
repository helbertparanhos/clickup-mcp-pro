import { z } from "zod";
import { defineTool, teamIdParam, dateInput, toEpochMs } from "../types.js";

/** Common query block for custom-task-id addressing. */
const idAddressing = {
  custom_task_ids: z
    .boolean()
    .optional()
    .describe("Set true to treat `task_id` as a custom task ID instead of a native ClickUp ID. Requires `team_id`."),
  team_id: teamIdParam,
};

const taskWriteBody = z.object({
  name: z.string().optional().describe("Task name/title."),
  description: z.string().optional().describe("Plain-text task description."),
  markdown_content: z.string().optional().describe("Markdown task description. Takes precedence over `description` if both are given."),
  status: z.string().optional().describe("Status name (must exist in the task's List, e.g. 'to do', 'in progress', 'complete')."),
  priority: z.number().int().min(1).max(4).nullable().optional().describe("Priority: 1=urgent, 2=high, 3=normal, 4=low; null clears it."),
  due_date: dateInput.optional().describe("Due date (natural language, ISO, or epoch ms)."),
  due_date_time: z.boolean().optional().describe("If true, the due date includes a specific time of day."),
  start_date: dateInput.optional().describe("Start date (natural language, ISO, or epoch ms)."),
  start_date_time: z.boolean().optional().describe("If true, the start date includes a specific time of day."),
  time_estimate: z.number().int().optional().describe("Time estimate in milliseconds."),
  assignees: z
    .array(z.union([z.string(), z.number()]))
    .optional()
    .describe("Full set of assignee user ids. On update this REPLACES the current assignees (use assignees_add/assignees_rem for incremental changes)."),
  tags: z.array(z.string()).optional().describe("Tag names to set on the task (must already exist in the Space)."),
  parent: z.string().optional().describe("Parent task id; set to make this task a subtask of that parent."),
  custom_fields: z
    .array(z.object({
      id: z.string().describe("Custom field id."),
      value: z.any().describe("Value in the shape required by the field's type."),
    }))
    .optional()
    .describe("Array of custom field assignments as { id, value } objects."),
  custom_item_id: z.number().int().nullable().optional().describe("Custom task type id (from `get_custom_task_types`); null for the default Task type."),
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
      "Get tasks in a specific List with rich filtering — by status, assignees, tags, and due/created/updated date ranges — plus ordering, subtasks and custom-field filters. Paginated. Use when you know which List the tasks live in.",
    schema: z.object({
      list_id: z.string().describe("ID of the List to read tasks from."),
      archived: z.boolean().optional().describe("If true, include archived tasks. Defaults to false."),
      include_closed: z.boolean().optional().describe("If true, also include closed/done tasks."),
      page: z.number().int().optional().describe("0-based page number for pagination. Defaults to 0."),
      order_by: z.enum(["created", "updated", "due_date", "id"]).optional().describe("Field to sort by."),
      reverse: z.boolean().optional().describe("If true, reverse the sort order (descending)."),
      subtasks: z.boolean().optional().describe("If true, include subtasks in the results."),
      statuses: z.array(z.string()).optional().describe("Only return tasks whose status name is in this list."),
      assignees: z.array(z.union([z.string(), z.number()])).optional().describe("Only return tasks assigned to any of these user ids."),
      tags: z.array(z.string()).optional().describe("Only return tasks that have all of these tag names."),
      due_date_gt: dateInput.optional().describe("Only tasks due AFTER this date (natural language, ISO, or epoch ms)."),
      due_date_lt: dateInput.optional().describe("Only tasks due BEFORE this date."),
      date_created_gt: dateInput.optional().describe("Only tasks created AFTER this date."),
      date_created_lt: dateInput.optional().describe("Only tasks created BEFORE this date."),
      date_updated_gt: dateInput.optional().describe("Only tasks updated AFTER this date."),
      date_updated_lt: dateInput.optional().describe("Only tasks updated BEFORE this date."),
      custom_fields: z
        .array(z.object({
          field_id: z.string().describe("Custom field id to filter on."),
          operator: z.string().describe("Comparison operator, e.g. '=', '<', '>', 'IS NOT NULL'."),
          value: z.any().describe("Value to compare against."),
        }))
        .optional()
        .describe("Array of custom-field filter conditions."),
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
    description:
      "Get a single task by id with full detail — status, assignees, custom fields, dates, and optionally subtasks and the markdown description. Use to inspect one known task.",
    schema: z.object({
      task_id: z.string().describe("ID of the task to fetch."),
      include_subtasks: z.boolean().optional().describe("If true, include the task's subtasks in the response."),
      include_markdown_description: z.boolean().optional().describe("If true, include the description rendered as markdown."),
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
      "Search tasks across the entire Workspace with filters (Spaces, Folders, Lists, statuses, assignees, tags, due dates). This is the deep search to use when you don't know which List a task is in. Paginated.",
    schema: z.object({
      team_id: teamIdParam,
      page: z.number().int().optional().describe("0-based page number for pagination. Defaults to 0."),
      order_by: z.enum(["created", "updated", "due_date", "id"]).optional().describe("Field to sort by."),
      reverse: z.boolean().optional().describe("If true, reverse the sort order (descending)."),
      subtasks: z.boolean().optional().describe("If true, include subtasks in the results."),
      include_closed: z.boolean().optional().describe("If true, also include closed/done tasks."),
      space_ids: z.array(z.string()).optional().describe("Restrict the search to these Space ids."),
      project_ids: z.array(z.string()).optional().describe("Restrict the search to these Folder ids (ClickUp calls Folders 'projects' here)."),
      list_ids: z.array(z.string()).optional().describe("Restrict the search to these List ids."),
      statuses: z.array(z.string()).optional().describe("Only return tasks whose status name is in this list."),
      assignees: z.array(z.union([z.string(), z.number()])).optional().describe("Only return tasks assigned to any of these user ids."),
      tags: z.array(z.string()).optional().describe("Only return tasks that have all of these tag names."),
      due_date_gt: dateInput.optional().describe("Only tasks due AFTER this date (natural language, ISO, or epoch ms)."),
      due_date_lt: dateInput.optional().describe("Only tasks due BEFORE this date."),
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
    description:
      "Create a new task in a List, setting any fields you provide (description, status, priority, dates, assignees, tags, custom fields, parent for subtasks). Returns the created task with its id.",
    write: true,
    schema: z
      .object({
        list_id: z.string().describe("ID of the List to create the task in."),
        name: z.string().describe("Name/title of the new task."),
      })
      .merge(taskWriteBody.omit({ name: true }))
      .extend(idAddressing),
    handler: async (args, client) => {
      const { list_id, custom_task_ids, team_id, ...rest } = args;
      return client.post(`/list/${list_id}/task`, { body: buildBody(rest) });
    },
  }),

  defineTool({
    name: "update_task",
    description:
      "Update any field of a task — pass only the fields you want to change. For assignees, `assignees` replaces the whole set, while `assignees_add`/`assignees_rem` change them incrementally. Returns the updated task.",
    write: true,
    schema: z
      .object({ task_id: z.string().describe("ID of the task to update.") })
      .merge(taskWriteBody)
      .extend({
        archived: z.boolean().optional().describe("Set true to archive the task, false to unarchive it."),
        assignees_add: z.array(z.union([z.string(), z.number()])).optional().describe("User ids to ADD as assignees (incremental, leaves others in place)."),
        assignees_rem: z.array(z.union([z.string(), z.number()])).optional().describe("User ids to REMOVE from assignees (incremental)."),
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
    description:
      "Permanently delete a task by id. This cannot be undone. Returns a confirmation with the deleted task id.",
    write: true,
    schema: z.object({ task_id: z.string().describe("ID of the task to delete."), ...idAddressing }),
    handler: async (args, client) => {
      const { task_id, ...params } = args;
      await client.del(`/task/${task_id}`, { params });
      return { deleted: true, task_id };
    },
  }),

  defineTool({
    name: "get_subtasks",
    description:
      "Get the subtasks of a parent task. Returns the parent task with its subtasks included. Use to enumerate a task's children.",
    schema: z.object({ task_id: z.string().describe("ID of the parent task."), ...idAddressing }),
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
      "Duplicate a task into a target List by reading the source and re-creating it (name, description, status, priority, assignees, tags and dates). Returns the new task. The copy is named '<name> (copy)' unless you override it.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the source task to duplicate."),
      list_id: z.string().describe("ID of the destination List for the copy."),
      name: z.string().optional().describe("Name for the copy. Defaults to '<source name> (copy)'."),
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
    description:
      "Set (or overwrite) a custom field's value on a task. The `value` shape depends on the field type (text/number primitive, drop_down option id, labels array, date epoch ms, users array). Look up the type with a get_*_custom_fields tool first.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to set the field on."),
      field_id: z.string().describe("ID of the custom field."),
      value: z.any().describe("Value to set, in the shape required by the field's type (see the tool description)."),
      value_options: z
        .record(z.any())
        .optional()
        .describe("Optional extra options for the value, e.g. { time: true } to include a time component for date fields."),
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
    description:
      "Clear a custom field's value on a task, resetting it to empty. Returns a confirmation with the task and field ids.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to clear the field on."),
      field_id: z.string().describe("ID of the custom field to clear."),
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
    description:
      "List the members who have access to a task, with their ids, usernames and emails. Use to see who can view or be assigned to the task.",
    schema: z.object({ task_id: z.string().describe("ID of the task to list members for.") }),
    handler: async (args, client) => client.get(`/task/${args.task_id}/member`),
  }),
];
