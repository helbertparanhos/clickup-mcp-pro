import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

/** All Docs endpoints live on the v3 API under /workspaces/{teamId}/docs. */
export const docTools = [
  defineTool({
    name: "search_docs",
    description: "Search/list Docs in a Workspace (v3).",
    schema: z.object({
      team_id: teamIdParam,
      query: z.string().optional().describe("Search text."),
      parent_id: z.string().optional(),
      parent_type: z.string().optional(),
      cursor: z.string().optional().describe("Pagination cursor (next_cursor from a previous call)."),
      limit: z.number().int().optional(),
      include_archived: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...params } = args;
      return client.get(`/workspaces/${teamId}/docs`, { version: "v3", params });
    },
  }),

  defineTool({
    name: "get_doc",
    description: "Get a single Doc by id (v3).",
    schema: z.object({ team_id: teamIdParam, doc_id: z.string().describe("Doc ID.") }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      return client.get(`/workspaces/${teamId}/docs/${args.doc_id}`, { version: "v3" });
    },
  }),

  defineTool({
    name: "create_doc",
    description: "Create a new Doc in a Workspace (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string().describe("Doc title."),
      parent: z
        .object({ id: z.string(), type: z.number().int() })
        .optional()
        .describe("Parent location { id, type }. type: 4=Space,5=Folder,6=List,7=Everything,12=Workspace."),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
      create_page: z.boolean().optional().describe("Create an initial empty page. Default true."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/workspaces/${teamId}/docs`, { version: "v3", body });
    },
  }),

  defineTool({
    name: "get_doc_page_listing",
    description: "Get the page tree/listing of a Doc (ids + hierarchy, v3).",
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("Doc ID."),
      max_page_depth: z.number().int().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      return client.get(`/workspaces/${teamId}/docs/${args.doc_id}/pageListing`, {
        version: "v3",
        params: { max_page_depth: args.max_page_depth },
      });
    },
  }),

  defineTool({
    name: "get_doc_pages",
    description: "Get all pages of a Doc with their content (v3).",
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("Doc ID."),
      content_format: z.enum(["text/md", "text/html"]).optional().describe("Default text/md."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      return client.get(`/workspaces/${teamId}/docs/${args.doc_id}/pages`, {
        version: "v3",
        params: { content_format: args.content_format },
      });
    },
  }),

  defineTool({
    name: "get_doc_page",
    description: "Get a single Doc page (with content, v3).",
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("Doc ID."),
      page_id: z.string().describe("Page ID."),
      content_format: z.enum(["text/md", "text/html"]).optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      return client.get(`/workspaces/${teamId}/docs/${args.doc_id}/pages/${args.page_id}`, {
        version: "v3",
        params: { content_format: args.content_format },
      });
    },
  }),

  defineTool({
    name: "create_doc_page",
    description: "Create a new page inside a Doc (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("Doc ID."),
      name: z.string().describe("Page title."),
      content: z.string().optional().describe("Page body."),
      content_format: z.enum(["text/md", "text/html"]).optional().describe("Default text/md."),
      parent_page_id: z.string().optional().describe("Nest under another page."),
      sub_title: z.string().optional(),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, doc_id, ...body } = args;
      return client.post(`/workspaces/${teamId}/docs/${doc_id}/pages`, {
        version: "v3",
        body,
      });
    },
  }),

  defineTool({
    name: "update_doc_page",
    description:
      "Update a Doc page. Use content_edit_mode to replace, append or prepend the content (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("Doc ID."),
      page_id: z.string().describe("Page ID."),
      name: z.string().optional(),
      sub_title: z.string().optional(),
      content: z.string().optional(),
      content_format: z.enum(["text/md", "text/html"]).optional(),
      content_edit_mode: z
        .enum(["replace", "append", "prepend"])
        .optional()
        .describe("How content is applied. Default replace."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, doc_id, page_id, ...body } = args;
      return client.put(`/workspaces/${teamId}/docs/${doc_id}/pages/${page_id}`, {
        version: "v3",
        body,
      });
    },
  }),
];
