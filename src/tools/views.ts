import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const viewBody = z.object({
  name: z.string().optional().describe("Display name of the View."),
  type: z
    .enum(["list", "board", "calendar", "table", "timeline", "workload", "activity", "map", "conversation", "gantt"])
    .optional()
    .describe("View type/layout (e.g. 'list', 'board', 'calendar', 'gantt')."),
  grouping: z.record(z.any()).optional().describe("Grouping config, e.g. group tasks by status/assignee/priority."),
  divide: z.record(z.any()).optional().describe("Column/swimlane division config for the View."),
  sorting: z.record(z.any()).optional().describe("Sort order config (fields and direction)."),
  filters: z.record(z.any()).optional().describe("Filter rules that decide which tasks appear in the View."),
  columns: z.record(z.any()).optional().describe("Which columns/fields are shown and their order."),
  team_sidebar: z.record(z.any()).optional().describe("Team sidebar display settings for the View."),
  settings: z.record(z.any()).optional().describe("Miscellaneous View settings (e.g. show closed, me-mode)."),
});

export const viewTools = [
  defineTool({
    name: "get_team_views",
    description:
      "List all Views at the Workspace/Everything level, with each View's id, name and type. Use to find a `view_id` for reading tasks across the whole Workspace.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/view`),
  }),

  defineTool({
    name: "get_space_views",
    description:
      "List all Views defined on a Space, with each View's id, name and type. Use to find a `view_id` scoped to a Space.",
    schema: z.object({ space_id: z.string().describe("ID of the Space whose Views to list.") }),
    handler: async (args, client) => client.get(`/space/${args.space_id}/view`),
  }),

  defineTool({
    name: "get_view",
    description:
      "Get a single View's full definition by id — its type, grouping, sorting, filters and columns. Use to inspect how a View is configured.",
    schema: z.object({ view_id: z.string().describe("ID of the View to fetch.") }),
    handler: async (args, client) => client.get(`/view/${args.view_id}`),
  }),

  defineTool({
    name: "get_view_tasks",
    description:
      "Get the tasks visible in a View, with the View's own filters and sorting applied, paginated. Returns the task list. Use this to read tasks exactly as a saved View shows them.",
    schema: z.object({
      view_id: z.string().describe("ID of the View to read tasks from."),
      page: z.number().int().optional().describe("0-based page number for pagination. Defaults to 0."),
    }),
    handler: async (args, client) =>
      client.get(`/view/${args.view_id}/task`, { params: { page: args.page ?? 0 } }),
  }),

  defineTool({
    name: "create_view",
    description:
      "Create a new View on a Team, Space, Folder or List. Provide exactly one parent id (team_id, space_id, folder_id or list_id) to choose where it lives. Returns the created View. Use to save a reusable filtered/grouped layout.",
    write: true,
    schema: z
      .object({
        name: z.string().describe("Display name for the new View."),
        type: viewBody.shape.type,
        team_id: z.string().optional().describe("Parent Team/Workspace id — set this to create a Workspace-level View."),
        space_id: z.string().optional().describe("Parent Space id — set this to create a Space-level View."),
        folder_id: z.string().optional().describe("Parent Folder id — set this to create a Folder-level View."),
        list_id: z.string().optional().describe("Parent List id — set this to create a List-level View."),
      })
      .merge(viewBody.omit({ name: true, type: true })),
    handler: async (args, client) => {
      const { team_id, space_id, folder_id, list_id, ...body } = args;
      let path: string;
      if (list_id) path = `/list/${list_id}/view`;
      else if (folder_id) path = `/folder/${folder_id}/view`;
      else if (space_id) path = `/space/${space_id}/view`;
      else path = `/team/${client.resolveTeamId(team_id)}/view`;
      return client.post(path, { body });
    },
  }),

  defineTool({
    name: "update_view",
    description:
      "Update a View's configuration — its name, grouping, sorting, filters, columns or settings. Only the provided fields change. Returns the updated View.",
    write: true,
    schema: z.object({ view_id: z.string().describe("ID of the View to update.") }).merge(viewBody),
    handler: async (args, client) => {
      const { view_id, ...body } = args;
      return client.put(`/view/${view_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_view",
    description:
      "Permanently delete a View by id. The underlying tasks are not affected, only the saved View. This cannot be undone. Returns a confirmation with the deleted View id.",
    write: true,
    schema: z.object({ view_id: z.string().describe("ID of the View to delete.") }),
    handler: async (args, client) => {
      await client.del(`/view/${args.view_id}`);
      return { deleted: true, view_id: args.view_id };
    },
  }),
];
