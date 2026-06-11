import { z } from "zod";
import { defineTool, teamIdParam, toEpochMs } from "../types.js";

/**
 * Bulk operations are implemented client-side by fanning out individual
 * ClickUp calls with bounded concurrency, since ClickUp has no native bulk
 * endpoints. Each item reports its own success/error so a partial failure
 * never loses the rest of the batch.
 */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

const CONCURRENCY = 5;

export const bulkTaskTools = [
  defineTool({
    name: "create_bulk_tasks",
    description:
      "Create many tasks in a single List in one call (up to 100). Runs with bounded concurrency and returns a per-task success/error report, so a partial failure never loses the rest of the batch. Use to import or scaffold many tasks at once.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("ID of the destination List for all created tasks."),
      tasks: z
        .array(
          z.object({
            name: z.string().describe("Task name."),
            description: z.string().optional().describe("Task description / body text."),
            status: z.string().optional().describe("Status name (must exist in the List, e.g. 'to do', 'in progress')."),
            priority: z.number().int().min(1).max(4).optional().describe("Priority: 1=urgent, 2=high, 3=normal, 4=low."),
            due_date: z
              .union([z.string(), z.number()])
              .optional()
              .describe("Due date (natural language, ISO, or epoch ms)."),
            assignees: z
              .array(z.union([z.string(), z.number()]))
              .optional()
              .describe("User ids to assign the task to."),
            tags: z.array(z.string()).optional().describe("Tag names to apply (must already exist in the Space)."),
            parent: z.string().optional().describe("Parent task id, to create this task as a subtask."),
          })
        )
        .min(1)
        .max(100)
        .describe("Array of task definitions to create (1–100 per call)."),
    }),
    handler: async (args, client) => {
      const results = await mapLimit(args.tasks, CONCURRENCY, async (t) => {
        try {
          const body = { ...t, due_date: toEpochMs(t.due_date) };
          const created = await client.post(`/list/${args.list_id}/task`, { body });
          return { ok: true, id: created.id, name: created.name };
        } catch (e: any) {
          return { ok: false, name: t.name, error: e.message };
        }
      });
      return { created: results.filter((r) => r.ok).length, total: results.length, results };
    },
  }),

  defineTool({
    name: "update_bulk_tasks",
    description:
      "Apply the same set of field changes to many tasks at once (up to 100). Returns a per-task success/error report. Use to mass-change status, priority, due date, or add/remove assignees across a batch of tasks.",
    write: true,
    schema: z.object({
      task_ids: z.array(z.string()).min(1).max(100).describe("Task ids to update (1–100 per call)."),
      update: z
        .object({
          name: z.string().optional().describe("New name to set on every task."),
          status: z.string().optional().describe("New status name to set on every task."),
          priority: z
            .number()
            .int()
            .min(1)
            .max(4)
            .nullable()
            .optional()
            .describe("New priority for every task (1=urgent..4=low), or null to clear it."),
          due_date: z
            .union([z.string(), z.number()])
            .optional()
            .describe("New due date for every task (natural language, ISO, or epoch ms)."),
          assignees_add: z
            .array(z.union([z.string(), z.number()]))
            .optional()
            .describe("User ids to ADD as assignees on every task."),
          assignees_rem: z
            .array(z.union([z.string(), z.number()]))
            .optional()
            .describe("User ids to REMOVE from assignees on every task."),
          archived: z.boolean().optional().describe("Set true to archive every task, false to unarchive."),
        })
        .describe("Fields applied to every task in task_ids (only the provided fields change)."),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe("Set true when task_ids are custom task IDs instead of native ClickUp IDs. Requires team_id."),
      team_id: teamIdParam,
    }),
    handler: async (args, client) => {
      const { assignees_add, assignees_rem, due_date, ...rest } = args.update;
      const body: Record<string, any> = { ...rest };
      if (due_date !== undefined) body.due_date = toEpochMs(due_date);
      if (assignees_add || assignees_rem)
        body.assignees = { add: assignees_add ?? [], rem: assignees_rem ?? [] };

      const results = await mapLimit(args.task_ids, CONCURRENCY, async (id) => {
        try {
          await client.put(`/task/${id}`, {
            params: { custom_task_ids: args.custom_task_ids, team_id: args.team_id },
            body,
          });
          return { ok: true, id };
        } catch (e: any) {
          return { ok: false, id, error: e.message };
        }
      });
      return { updated: results.filter((r) => r.ok).length, total: results.length, results };
    },
  }),

  defineTool({
    name: "delete_bulk_tasks",
    description:
      "Permanently delete many tasks at once (up to 100). This cannot be undone. Returns a per-task success/error report so you can see exactly which deletions succeeded.",
    write: true,
    schema: z.object({
      task_ids: z.array(z.string()).min(1).max(100).describe("Task ids to delete (1–100 per call)."),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe("Set true when task_ids are custom task IDs instead of native ClickUp IDs. Requires team_id."),
      team_id: teamIdParam,
    }),
    handler: async (args, client) => {
      const results = await mapLimit(args.task_ids, CONCURRENCY, async (id) => {
        try {
          await client.del(`/task/${id}`, {
            params: { custom_task_ids: args.custom_task_ids, team_id: args.team_id },
          });
          return { ok: true, id };
        } catch (e: any) {
          return { ok: false, id, error: e.message };
        }
      });
      return { deleted: results.filter((r) => r.ok).length, total: results.length, results };
    },
  }),

  defineTool({
    name: "move_bulk_tasks",
    description:
      "Add many tasks to a target List at once (up to 100), using ClickUp's multi-list association (the tasks also remain in their original List). Returns a per-task success/error report.",
    write: true,
    schema: z.object({
      task_ids: z.array(z.string()).min(1).max(100).describe("Task ids to add to the target List (1–100 per call)."),
      list_id: z.string().describe("ID of the destination List."),
    }),
    handler: async (args, client) => {
      const results = await mapLimit(args.task_ids, CONCURRENCY, async (id) => {
        try {
          await client.post(`/list/${args.list_id}/task/${id}`, {});
          return { ok: true, id };
        } catch (e: any) {
          return { ok: false, id, error: e.message };
        }
      });
      return { moved: results.filter((r) => r.ok).length, total: results.length, results };
    },
  }),
];
