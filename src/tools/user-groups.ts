import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

/** Team (User Group) management. */
export const userGroupTools = [
  defineTool({
    name: "list_user_groups",
    description:
      "List the User Groups (a.k.a. Teams — named sub-groups of people inside a Workspace) and their members. Returns each group's id, name, handle and member list. Use to find a `group_id` before mentioning or assigning a group.",
    schema: z.object({
      team_id: teamIdParam,
      group_ids: z
        .array(z.string())
        .optional()
        .describe("Optional list of specific User Group ids to fetch. Omit to return all groups in the Workspace."),
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
    description:
      "Create a new User Group (Team) in a Workspace with an initial set of members. Returns the created group with its id and handle. Use to organize people for mentions and bulk assignment.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string().describe("Display name for the new User Group."),
      members: z
        .array(z.union([z.string(), z.number()]))
        .describe("User ids to add as initial members of the group."),
      handle: z
        .string()
        .optional()
        .describe("Optional @-handle for the group (used for mentions). Defaults to one derived from the name."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/team/${teamId}/group`, { body });
    },
  }),

  defineTool({
    name: "update_user_group",
    description:
      "Update a User Group — rename it, change its handle, and/or add and remove members. Only the provided fields change. Returns the updated group.",
    write: true,
    schema: z.object({
      group_id: z.string().describe("ID of the User Group to update."),
      name: z.string().optional().describe("New display name. Omit to keep the current name."),
      handle: z.string().optional().describe("New @-handle. Omit to keep the current handle."),
      members: z
        .object({
          add: z
            .array(z.union([z.string(), z.number()]))
            .optional()
            .describe("User ids to add to the group."),
          rem: z
            .array(z.union([z.string(), z.number()]))
            .optional()
            .describe("User ids to remove from the group."),
        })
        .optional()
        .describe("Membership changes to apply (add and/or remove user ids)."),
    }),
    handler: async (args, client) => {
      const { group_id, ...body } = args;
      return client.put(`/group/${group_id}`, { body });
    },
  }),

  defineTool({
    name: "delete_user_group",
    description:
      "Permanently delete a User Group by id. Members are not deleted, only the grouping. This cannot be undone. Returns a confirmation with the deleted group id.",
    write: true,
    schema: z.object({ group_id: z.string().describe("ID of the User Group to delete.") }),
    handler: async (args, client) => {
      await client.del(`/group/${args.group_id}`);
      return { deleted: true, group_id: args.group_id };
    },
  }),
];
