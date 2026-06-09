import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";
import { findMember, findSpaceByName, findListInSpace } from "../resolve.js";

export const memberTools = [
  defineTool({
    name: "get_task_assignable_members",
    description: "List the members who can be assigned to a task.",
    schema: z.object({ task_id: z.string().describe("Task ID.") }),
    handler: async (args, client) => client.get(`/task/${args.task_id}/member`),
  }),

  defineTool({
    name: "get_list_members",
    description: "List the members who have access to a List (assignable users).",
    schema: z.object({ list_id: z.string().describe("List ID.") }),
    handler: async (args, client) => client.get(`/list/${args.list_id}/member`),
  }),

  defineTool({
    name: "find_member",
    description:
      "Resolve a Workspace member by name, username or email and return their user object (with id). Useful before assigning tasks.",
    schema: z.object({
      team_id: teamIdParam,
      query: z.string().describe("Name, username, email, or user id to look up."),
    }),
    handler: async (args, client) => {
      const r = await findMember(client, client.resolveTeamId(args.team_id), args.query);
      if (r.match) return { found: true, user: r.match };
      if (r.ambiguous)
        return { found: false, ambiguous: true, query: args.query, candidates: r.candidates };
      return { found: false, query: args.query };
    },
  }),

  defineTool({
    name: "find_space_by_name",
    description: "Resolve a Space id from its name (case-insensitive).",
    schema: z.object({
      team_id: teamIdParam,
      name: z.string().describe("Space name."),
    }),
    handler: async (args, client) => {
      const r = await findSpaceByName(client, client.resolveTeamId(args.team_id), args.name);
      if (r.match) return { found: true, space: r.match };
      if (r.ambiguous)
        return { found: false, ambiguous: true, name: args.name, candidates: r.candidates };
      return { found: false, name: args.name };
    },
  }),

  defineTool({
    name: "find_list_by_name",
    description: "Resolve a List id from its name within a Space (searches folders + folderless lists).",
    schema: z.object({
      space_id: z.string().describe("Space ID."),
      name: z.string().describe("List name."),
    }),
    handler: async (args, client) => {
      const r = await findListInSpace(client, args.space_id, args.name);
      if (r.match) return { found: true, list: r.match };
      if (r.ambiguous)
        return { found: false, ambiguous: true, name: args.name, candidates: r.candidates };
      return { found: false, name: args.name };
    },
  }),
];
