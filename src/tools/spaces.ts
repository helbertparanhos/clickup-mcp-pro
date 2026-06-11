import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

const featuresSchema = z
  .record(z.any())
  .optional()
  .describe("Feature toggles object, e.g. { due_dates: { enabled: true }, time_tracking: { enabled: true } }. Omit to keep defaults.");

export const spaceTools = [
  defineTool({
    name: "list_spaces",
    description:
      "List all Spaces in a Workspace, with each Space's id, name, privacy and enabled features. Spaces are the top level of the ClickUp hierarchy (Space → Folder → List → Task). Use to discover a `space_id`.",
    schema: z.object({
      team_id: teamIdParam,
      archived: z.boolean().optional().describe("If true, include archived Spaces. Defaults to false."),
    }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/space`, {
        params: { archived: args.archived ?? false },
      }),
  }),

  defineTool({
    name: "get_space",
    description:
      "Get a single Space by id, including its name, privacy, assignee settings and enabled features. Use to inspect a Space's configuration.",
    schema: z.object({ space_id: z.string().describe("ID of the Space to fetch.") }),
    handler: async (args, client) => client.get(`/space/${args.space_id}`),
  }),

  defineTool({
    name: "create_space",
    description:
      "Create a new Space in a Workspace. Optionally enable multiple assignees and toggle features. Returns the created Space with its id. Use to start a new top-level area of work.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string().describe("Name for the new Space."),
      multiple_assignees: z
        .boolean()
        .optional()
        .describe("If true, tasks in this Space can have more than one assignee."),
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
    description:
      "Update a Space — rename it, change its privacy, assignee mode, admin permissions, or feature toggles. Only the provided fields change. Returns the updated Space.",
    write: true,
    schema: z.object({
      space_id: z.string().describe("ID of the Space to update."),
      name: z.string().optional().describe("New name. Omit to keep the current name."),
      private: z.boolean().optional().describe("Set true to make the Space private, false to make it public to the Workspace."),
      multiple_assignees: z.boolean().optional().describe("Set true to allow multiple assignees per task."),
      admin_can_manage: z.boolean().optional().describe("Set true to let admins manage this private Space (Enterprise feature)."),
      features: featuresSchema,
    }),
    handler: async (args, client) => {
      const { space_id, ...body } = args;
      return client.put(`/space/${space_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_space",
    description:
      "Permanently delete a Space and everything inside it (Folders, Lists, tasks). This cannot be undone. Returns a confirmation with the deleted Space id.",
    write: true,
    schema: z.object({ space_id: z.string().describe("ID of the Space to delete.") }),
    handler: async (args, client) => {
      await client.del(`/space/${args.space_id}`);
      return { deleted: true, space_id: args.space_id };
    },
  }),

];
