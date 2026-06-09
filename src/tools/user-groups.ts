import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

/** Team (User Group) management. */
export const userGroupTools = [
  defineTool({
    name: "list_user_groups",
    description: "List the User Groups (Teams) in a Workspace.",
    schema: z.object({
      team_id: teamIdParam,
      group_ids: z.array(z.string()).optional().describe("Filter to specific group ids."),
    }),
    handler: async (args, client) =>
      client.get(`/group`, {
        params: {
          team_id: client.resolveTeamId(args.team_id),
          // ClickUp expects group_ids as a comma-separated string for this endpoint.
          group_ids: args.group_ids?.join(","),
        },
      }),
  }),

  defineTool({
    name: "create_user_group",
    description: "Create a User Group (Team) in a Workspace.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string(),
      members: z.array(z.union([z.string(), z.number()])).describe("User ids."),
      handle: z.string().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/team/${teamId}/group`, { body });
    },
  }),

  defineTool({
    name: "update_user_group",
    description: "Update a User Group (rename, change handle, add/remove members).",
    write: true,
    schema: z.object({
      group_id: z.string().describe("User Group ID."),
      name: z.string().optional(),
      handle: z.string().optional(),
      members: z
        .object({
          add: z.array(z.union([z.string(), z.number()])).optional(),
          rem: z.array(z.union([z.string(), z.number()])).optional(),
        })
        .optional(),
    }),
    handler: async (args, client) => {
      const { group_id, ...body } = args;
      return client.put(`/group/${group_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_user_group",
    description: "Delete a User Group.",
    write: true,
    schema: z.object({ group_id: z.string().describe("User Group ID.") }),
    handler: async (args, client) => {
      await client.del(`/group/${args.group_id}`);
      return { deleted: true, group_id: args.group_id };
    },
  }),
];
