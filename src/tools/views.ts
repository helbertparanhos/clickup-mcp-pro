import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const viewBody = z.object({
  name: z.string().optional(),
  type: z
    .enum(["list", "board", "calendar", "table", "timeline", "workload", "activity", "map", "conversation", "gantt"])
    .optional(),
  grouping: z.record(z.any()).optional(),
  divide: z.record(z.any()).optional(),
  sorting: z.record(z.any()).optional(),
  filters: z.record(z.any()).optional(),
  columns: z.record(z.any()).optional(),
  team_sidebar: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

export const viewTools = [
  defineTool({
    name: "get_team_views",
    description: "List all Views at the Workspace/Everything level.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/view`),
  }),

  defineTool({
    name: "get_space_views",
    description: "List all Views on a Space.",
    schema: z.object({ space_id: z.string().describe("Space ID.") }),
    handler: async (args, client) => client.get(`/space/${args.space_id}/view`),
  }),

  defineTool({
    name: "get_view",
    description: "Get a single View's definition by id.",
    schema: z.object({ view_id: z.string().describe("View ID.") }),
    handler: async (args, client) => client.get(`/view/${args.view_id}`),
  }),

  defineTool({
    name: "get_view_tasks",
    description: "Get the tasks visible in a View (paginated).",
    schema: z.object({
      view_id: z.string().describe("View ID."),
      page: z.number().int().optional().describe("0-based page."),
    }),
    handler: async (args, client) =>
      client.get(`/view/${args.view_id}/task`, { params: { page: args.page ?? 0 } }),
  }),

  defineTool({
    name: "create_view",
    description:
      "Create a View on a Team, Space, Folder or List. Provide exactly one parent id (team_id/space_id/folder_id/list_id).",
    write: true,
    schema: z
      .object({
        name: z.string(),
        type: viewBody.shape.type,
        team_id: z.string().optional(),
        space_id: z.string().optional(),
        folder_id: z.string().optional(),
        list_id: z.string().optional(),
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
    description: "Update a View's configuration.",
    write: true,
    schema: z.object({ view_id: z.string().describe("View ID.") }).merge(viewBody),
    handler: async (args, client) => {
      const { view_id, ...body } = args;
      return client.put(`/view/${view_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_view",
    description: "Delete a View.",
    write: true,
    schema: z.object({ view_id: z.string().describe("View ID.") }),
    handler: async (args, client) => {
      await client.del(`/view/${args.view_id}`);
      return { deleted: true, view_id: args.view_id };
    },
  }),
];
