import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

/** Guest management — Enterprise plan only. */
const permissionLevel = z
  .enum(["read", "comment", "edit", "create"])
  .optional()
  .describe("Permission level to grant on the resource.");

export const guestTools = [
  defineTool({
    name: "invite_guest",
    description: "Invite a guest (by email) to a Workspace. Enterprise only.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      email: z.string().describe("Guest email."),
      can_edit_tags: z.boolean().optional(),
      can_see_time_spent: z.boolean().optional(),
      can_see_time_estimated: z.boolean().optional(),
      can_create_views: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/team/${teamId}/guest`, { body });
    },
  }),

  defineTool({
    name: "get_guest",
    description: "Get a guest's details. Enterprise only.",
    schema: z.object({ team_id: teamIdParam, guest_id: z.union([z.string(), z.number()]) }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/guest/${args.guest_id}`),
  }),

  defineTool({
    name: "edit_guest",
    description: "Edit a guest's permissions. Enterprise only.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      guest_id: z.union([z.string(), z.number()]),
      can_edit_tags: z.boolean().optional(),
      can_see_time_spent: z.boolean().optional(),
      can_see_time_estimated: z.boolean().optional(),
      can_create_views: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, guest_id, ...body } = args;
      return client.put(`/team/${teamId}/guest/${guest_id}`, { body });
    },
  }),

  defineTool({
    name: "remove_guest",
    description: "Remove a guest from a Workspace. Enterprise only.",
    write: true,
    schema: z.object({ team_id: teamIdParam, guest_id: z.union([z.string(), z.number()]) }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      await client.del(`/team/${teamId}/guest/${args.guest_id}`);
      return { removed: true, guest_id: args.guest_id };
    },
  }),

  defineTool({
    name: "add_guest_to_task",
    description: "Grant a guest access to a task. Enterprise only.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      guest_id: z.union([z.string(), z.number()]),
      permission_level: permissionLevel,
      custom_task_ids: z.boolean().optional(),
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
    description: "Revoke a guest's access to a task. Enterprise only.",
    write: true,
    schema: z.object({
      task_id: z.string().describe("Task ID."),
      guest_id: z.union([z.string(), z.number()]),
      custom_task_ids: z.boolean().optional(),
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
    description: "Grant a guest access to a List. Enterprise only.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("List ID."),
      guest_id: z.union([z.string(), z.number()]),
      permission_level: permissionLevel,
    }),
    handler: async (args, client) =>
      client.post(`/list/${args.list_id}/guest/${args.guest_id}`, {
        body: { permission_level: args.permission_level },
      }),
  }),

  defineTool({
    name: "remove_guest_from_list",
    description: "Revoke a guest's access to a List. Enterprise only.",
    write: true,
    schema: z.object({
      list_id: z.string().describe("List ID."),
      guest_id: z.union([z.string(), z.number()]),
    }),
    handler: async (args, client) => {
      await client.del(`/list/${args.list_id}/guest/${args.guest_id}`);
      return { removed: true, list_id: args.list_id, guest_id: args.guest_id };
    },
  }),

  defineTool({
    name: "add_guest_to_folder",
    description: "Grant a guest access to a Folder. Enterprise only.",
    write: true,
    schema: z.object({
      folder_id: z.string().describe("Folder ID."),
      guest_id: z.union([z.string(), z.number()]),
      permission_level: permissionLevel,
    }),
    handler: async (args, client) =>
      client.post(`/folder/${args.folder_id}/guest/${args.guest_id}`, {
        body: { permission_level: args.permission_level },
      }),
  }),

  defineTool({
    name: "remove_guest_from_folder",
    description: "Revoke a guest's access to a Folder. Enterprise only.",
    write: true,
    schema: z.object({
      folder_id: z.string().describe("Folder ID."),
      guest_id: z.union([z.string(), z.number()]),
    }),
    handler: async (args, client) => {
      await client.del(`/folder/${args.folder_id}/guest/${args.guest_id}`);
      return { removed: true, folder_id: args.folder_id, guest_id: args.guest_id };
    },
  }),
];
