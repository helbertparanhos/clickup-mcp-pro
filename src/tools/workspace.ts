import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

export const workspaceTools = [
  defineTool({
    name: "get_workspaces",
    description:
      "List all Teams/Workspaces the authorized token can access, including members. Use this first to discover team_id values.",
    schema: z.object({}),
    handler: async (_args, client) => client.get(`/team`),
  }),

  defineTool({
    name: "get_workspace_seats",
    description:
      "Get seat usage for a Workspace — how many member and guest seats are used vs. the total available on the current plan. Use to check capacity before inviting people.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/seats`),
  }),

  defineTool({
    name: "get_workspace_plan",
    description:
      "Get the current subscription plan (name and id) of a Workspace, e.g. Free, Unlimited, Business. Use to know which features and limits apply.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/plan`),
  }),

  defineTool({
    name: "get_workspace_members",
    description:
      "List all members (users) of a Workspace with their ids, emails and roles. Useful for resolving assignees.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const data = await client.get(`/team`);
      const team = (data.teams ?? []).find((t: any) => String(t.id) === String(teamId));
      if (!team) throw new Error(`Team ${teamId} not found among accessible workspaces.`);
      return { team_id: teamId, members: team.members ?? [] };
    },
  }),

  defineTool({
    name: "get_custom_task_types",
    description:
      "List the custom task types defined in a Workspace (e.g. Bug, Feature, Milestone). Returns each type's id and name. Use to find a `custom_item_id` when creating tasks of a specific type.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/custom_item`),
  }),

  defineTool({
    name: "get_authorized_user",
    description:
      "Get the profile of the user that owns the configured API token — id, username, email and color. Use to identify 'me' for self-assignment or filtering by the current user.",
    schema: z.object({}),
    handler: async (_args, client) => client.get(`/user`),
  }),
];
