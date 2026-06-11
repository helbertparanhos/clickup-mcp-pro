import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

/** Guest management — Enterprise plan only. */
const permissionLevel = z
  .enum(["read", "comment", "edit", "create"])
  .optional()
  .describe("Permission level to grant: 'read' (view only), 'comment', 'edit', or 'create'.");

const guestIdParam = z
  .union([z.string(), z.number()])
  .describe("ID of the guest (the guest user's numeric id).");

const guestPermissionFlags = {
  can_edit_tags: z.boolean().optional().describe("Allow the guest to add/remove tags on shared items."),
  can_see_time_spent: z.boolean().optional().describe("Allow the guest to see time tracked on shared items."),
  can_see_time_estimated: z.boolean().optional().describe("Allow the guest to see time estimates on shared items."),
  can_create_views: z.boolean().optional().describe("Allow the guest to create Views on shared items."),
};

export const guestTools = [
  defineTool({
    name: "invite_guest",
    description:
      "Invite an external guest to a Workspace by email, with optional capability flags. Returns the created guest. Enterprise plan only. Use to bring in a client/contractor before sharing specific tasks, Lists or Folders with them.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      email: z.string().describe("Email address of the guest to invite."),
      ...guestPermissionFlags,
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/team/${teamId}/guest`, { body });
    },
  }),

  defineTool({
    name: "get_guest",
    description:
      "Get a guest's details by id — their email, capabilities and the items shared with them. Enterprise plan only.",
    schema: z.object({ team_id: teamIdParam, guest_id: guestIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/guest/${args.guest_id}`),
  }),

  defineTool({
    name: "edit_guest",
    description:
      "Edit a guest's Workspace-level capabilities (tags, time visibility, view creation). Only the provided flags change. Returns the updated guest. Enterprise plan only.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      guest_id: guestIdParam,
      ...guestPermissionFlags,
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, guest_id, ...body } = args;
      return client.put(`/team/${teamId}/guest/${guest_id}`, { body });
    },
  }),

  defineTool({
    name: "remove_guest",
    description:
      "Remove a guest from a Workspace entirely, revoking all their access. This cannot be undone. Returns a confirmation. Enterprise plan only.",
    write: true,
    schema: z.object({ team_id: teamIdParam, guest_id: guestIdParam }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      await client.del(`/team/${teamId}/guest/${args.guest_id}`);
      return { removed: true, guest_id: args.guest_id };
    },
  }),

  defineTool({
    name: "add_guest_to_task",
    description:
      "Share a single task with a guest at a chosen permission level. Returns the updated guest. Enterprise plan only.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to share."),
      guest_id: guestIdParam,
      permission_level: permissionLevel,
      custom_task_ids: z
        .boolean()
        .optional()
        .describe("Set true when `task_id` is a custom task ID instead of a native ClickUp ID. Requires team_id."),
      team_id: teamIdParam,
    }),
    handler: async (args, client) => {
      const { task_id, guest_id, permission_level, custom_task_ids, team_id } = args;
      return client.post(`/task/${task_id}/guest/${guest_id}`, {
        params: { custom_task_ids, team_id },
        body: { permission_level },
      });
    },
  }),

  defineTool({
    name: "remove_guest_from_task",
    description:
      "Revoke a guest's access to a single task. Returns a confirmation. Enterprise plan only.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("ID of the task to unshare."),
      guest_id: guestIdParam,
      custom_task_ids: z
        .boolean()
        .optional()
        .describe("Set true when `task_id` is a custom task ID instead of a native ClickUp ID. Requires team_id."),
      team_id: teamIdParam,
    }),
    handler: async (args, client) => {
      const { task_id, guest_id, custom_task_ids, team_id } = args;
      await client.del(`/task/${task_id}/guest/${guest_id}`, {
        params: { custom_task_ids, team_id },
      });
      return { removed: true, task_id, guest_id };
    },
  }),

  defineTool({
    name: "add_guest_to_list",
    description:
      "Share an entire List (and its tasks) with a guest at a chosen permission level. Returns the updated guest. Enterprise plan only.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("ID of the List to share."),
      guest_id: guestIdParam,
      permission_level: permissionLevel,
    }),
    handler: async (args, client) =>
      client.post(`/list/${args.list_id}/guest/${args.guest_id}`, {
        body: { permission_level: args.permission_level },
      }),
  }),

  defineTool({
    name: "remove_guest_from_list",
    description:
      "Revoke a guest's access to a List. Returns a confirmation. Enterprise plan only.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("ID of the List to unshare."),
      guest_id: guestIdParam,
    }),
    handler: async (args, client) => {
      await client.del(`/list/${args.list_id}/guest/${args.guest_id}`);
      return { removed: true, list_id: args.list_id, guest_id: args.guest_id };
    },
  }),

  defineTool({
    name: "add_guest_to_folder",
    description:
      "Share an entire Folder (and its Lists/tasks) with a guest at a chosen permission level. Returns the updated guest. Enterprise plan only.",
    write: true,
    schema: z.object({
      folder_id: z.string().describe("ID of the Folder to share."),
      guest_id: guestIdParam,
      permission_level: permissionLevel,
    }),
    handler: async (args, client) =>
      client.post(`/folder/${args.folder_id}/guest/${args.guest_id}`, {
        body: { permission_level: args.permission_level },
      }),
  }),

  defineTool({
    name: "remove_guest_from_folder",
    description:
      "Revoke a guest's access to a Folder. Returns a confirmation. Enterprise plan only.",
    write: true,
    schema: z.object({
      folder_id: z.string().describe("ID of the Folder to unshare."),
      guest_id: guestIdParam,
    }),
    handler: async (args, client) => {
      await client.del(`/folder/${args.folder_id}/guest/${args.guest_id}`);
      return { removed: true, folder_id: args.folder_id, guest_id: args.guest_id };
    },
  }),
];
