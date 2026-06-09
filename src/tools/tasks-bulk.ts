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
      "Create many tasks in a single List at once. Returns per-task success/error so partial failures are visible.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("Destination List ID."),
      tasks: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            status: z.string().optional(),
            priority: z.number().int().min(1).max(4).optional(),
            due_date: z.union([z.string(), z.number()]).optional(),
            assignees: z.array(z.union([z.string(), z.number()])).optional(),
            tags: z.array(z.string()).optional(),
            parent: z.string().optional(),
          })
        )
        .min(1)
        .max(100)
        .describe("Array of task definitions (max 100 per call)."),
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
    description: "Apply the same or per-task updates to many tasks at once.",
    write: true,
    schema: z.object({
      task_ids: z.array(z.string()).min(1).max(100).describe("Task IDs to update (max 100 per call)."),
      update: z
        .object({
          name: z.string().optional(),
          status: z.string().optional(),
          priority: z.number().int().min(1).max(4).nullable().optional(),
          due_date: z.union([z.string(), z.number()]).optional(),
          assignees_add: z.array(z.union([z.string(), z.number()])).optional(),
          assignees_rem: z.array(z.union([z.string(), z.number()])).optional(),
          archived: z.boolean().optional(),
        })
        .describe("Fields applied to every task in task_ids."),
      custom_task_ids: z.boolean().optional(),
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
    description: "Delete many tasks at once.",
    write: true,
    schema: z.object({
      task_ids: z.array(z.string()).min(1).max(100).describe("Task IDs to delete (max 100 per call)."),
      custom_task_ids: z.boolean().optional(),
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
      "Move many tasks into a target List (adds them to the list; uses multi-list association).",
    write: true,
    schema: z.object({
      task_ids: z.array(z.string()).min(1).max(100).describe("Task IDs to move (max 100 per call)."),
      list_id: z.string().describe("Destination List ID."),
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
