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
    description: "Get seat usage (used/total) for a Workspace's members and guests.",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/seats`),
  }),

  defineTool({
    name: "get_workspace_plan",
    description: "Get the current plan (name and id) of a Workspace.",
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
    description: "List the custom task types defined in a Workspace (e.g. Bug, Feature).",
    schema: z.object({ team_id: teamIdParam }),
    handler: async (args, client) =>
      client.get(`/team/${client.resolveTeamId(args.team_id)}/custom_item`),
  }),

  defineTool({
    name: "get_authorized_user",
    description: "Get details of the user that owns the configured API token.",
    schema: z.object({}),
    handler: async (_args, client) => client.get(`/user`),
  }),
];
