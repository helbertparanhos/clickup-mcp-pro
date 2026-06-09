import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const featuresSchema = z
  .record(z.any())
  .optional()
  .describe("Feature toggles object, e.g. { due_dates: { enabled: true }, time_tracking: { enabled: true } }.");

export const spaceTools = [
  defineTool({
    name: "list_spaces",
    description: "List all Spaces in a Workspace.",
    schema: z.object({
      team_id: teamIdParam,
      archived: z.boolean().optional().describe("Include archived spaces. Default false."),
    }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/space`, {
        params: { archived: args.archived ?? false },
      }),
  }),

  defineTool({
    name: "get_space",
    description: "Get a single Space by id.",
    schema: z.object({ space_id: z.string().describe("Space ID.") }),
    handler: async (args, client) => client.get(`/space/${args.space_id}`),
  }),

  defineTool({
    name: "create_space",
    description: "Create a new Space in a Workspace.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string().describe("Space name."),
      multiple_assignees: z.boolean().optional().describe("Allow multiple assignees per task."),
      features: featuresSchema,
    }),
    handler: async (args, client) =>
      client.post(`/team/${client.resolveTeamId(args.team_id)}/space`, {
        body: {
          name: args.name,
          multiple_assignees: args.multiple_assignees,
          features: args.features,
        },
      }),
  }),

  defineTool({
    name: "update_space",
    description: "Update a Space (name, privacy, assignee mode, features).",
    write: true,
    schema: z.object({
      space_id: z.string().describe("Space ID."),
      name: z.string().optional(),
      private: z.boolean().optional(),
      multiple_assignees: z.boolean().optional(),
      admin_can_manage: z.boolean().optional(),
      features: featuresSchema,
    }),
    handler: async (args, client) => {
      const { space_id, ...body } = args;
      return client.put(`/space/${space_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_space",
    description: "Delete a Space permanently.",
    write: true,
    schema: z.object({ space_id: z.string().describe("Space ID.") }),
    handler: async (args, client) => {
      await client.del(`/space/${args.space_id}`);
      return { deleted: true, space_id: args.space_id };
    },
  }),

];
