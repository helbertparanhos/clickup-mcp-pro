import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

/** All Docs endpoints live on the v3 API under /workspaces/{teamId}/docs. */
export const docTools = [
  defineTool({
    name: "search_docs",
    description:
      "Search or list Docs in a Workspace (ClickUp Docs v3). Returns matching Docs with their ids, titles and locations. Use to find a `doc_id` by keyword or to browse Docs under a parent. Paginate with `cursor`.",
    schema: z.object({
      team_id: teamIdParam,
      query: z.string().optional().describe("Text to search Doc titles/content for. Omit to list all Docs."),
      parent_id: z.string().optional().describe("Restrict results to Docs under this parent container's id."),
      parent_type: z.string().optional().describe("Type of the parent container (used together with parent_id)."),
      cursor: z.string().optional().describe("Pagination cursor (the `next_cursor` returned by a previous call)."),
      limit: z.number().int().optional().describe("Maximum number of Docs to return in this page."),
      include_archived: z.boolean().optional().describe("If true, also include archived Docs. Defaults to false."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...params } = args;
      return client.get(`/workspaces/${teamId}/docs`, { version: "v3", params });
    },
  }),

  defineTool({
    name: "get_doc",
    description:
      "Get a single Doc's metadata by id (ClickUp Docs v3) — its title, parent location and settings. Use `get_doc_pages` to read the actual content.",
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("ID of the Doc to fetch."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      return client.get(`/workspaces/${teamId}/docs/${args.doc_id}`, { version: "v3" });
    },
  }),

  defineTool({
    name: "create_doc",
    description:
      "Create a new Doc in a Workspace (ClickUp Docs v3), optionally nested under a Space/Folder/List and with a visibility setting. Returns the created Doc with its id. Add pages afterwards with `create_doc_page`.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string().describe("Title of the new Doc."),
      parent: z
        .object({
          id: z.string().describe("ID of the parent container."),
          type: z.number().int().describe("Parent container type: 4=Space, 5=Folder, 6=List, 7=Everything, 12=Workspace."),
        })
        .optional()
        .describe("Where to place the Doc. Omit to create it at the Workspace level."),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional().describe("Doc visibility. PUBLIC = visible to the Workspace, PRIVATE = only you."),
      create_page: z.boolean().optional().describe("If true (default), create an initial empty page in the Doc."),
    }),
    handler: async (args, client) => {
      const teamId = client.resolveTeamId(args.team_id);
      const { team_id, ...body } = args;
      return client.post(`/workspaces/${teamId}/docs`, { version: "v3", body });
    },
  }),

  defineTool({
    name: "get_doc_page_listing",
    description:
      "Get the page tree of a Doc (ClickUp Docs v3) — page ids, titles and their nesting hierarchy, without the full content. Use to navigate a Doc's structure before fetching a specific page.",
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("ID of the Doc whose page tree to fetch."),
      max_page_depth: z.number().int().optional().describe("Limit how many levels of nested pages to return. Omit for all levels."),
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
    description:
      "Get every page of a Doc together with its full content (ClickUp Docs v3). Returns content as markdown by default. Use to read an entire Doc at once.",
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("ID of the Doc whose pages to fetch."),
      content_format: z
        .enum(["text/md", "text/html"])
        .optional()
        .describe("Format to return page content in: 'text/md' (default) or 'text/html'."),
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
    description:
      "Get a single page of a Doc with its content (ClickUp Docs v3). Returns content as markdown by default. Use after `get_doc_page_listing` to read one specific page.",
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("ID of the Doc the page belongs to."),
      page_id: z.string().describe("ID of the page to fetch."),
      content_format: z
        .enum(["text/md", "text/html"])
        .optional()
        .describe("Format to return the content in: 'text/md' (default) or 'text/html'."),
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
    description:
      "Create a new page inside a Doc (ClickUp Docs v3), optionally nested under an existing page and with initial content. Returns the created page with its id.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("ID of the Doc to add the page to."),
      name: z.string().describe("Title of the new page."),
      content: z.string().optional().describe("Initial page body content. Format is set by `content_format`."),
      content_format: z
        .enum(["text/md", "text/html"])
        .optional()
        .describe("Format of the `content` field: 'text/md' (default) or 'text/html'."),
      parent_page_id: z.string().optional().describe("ID of an existing page to nest this new page under."),
      sub_title: z.string().optional().describe("Optional subtitle shown under the page title."),
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
      "Update a Doc page's title, subtitle or content (ClickUp Docs v3). Use `content_edit_mode` to replace, append to, or prepend the existing content. Only the provided fields change. Returns the updated page.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      doc_id: z.string().describe("ID of the Doc the page belongs to."),
      page_id: z.string().describe("ID of the page to update."),
      name: z.string().optional().describe("New page title. Omit to keep current."),
      sub_title: z.string().optional().describe("New subtitle. Omit to keep current."),
      content: z.string().optional().describe("Content to apply, combined with `content_edit_mode`."),
      content_format: z
        .enum(["text/md", "text/html"])
        .optional()
        .describe("Format of the `content` field: 'text/md' (default) or 'text/html'."),
      content_edit_mode: z
        .enum(["replace", "append", "prepend"])
        .optional()
        .describe("How `content` is applied: 'replace' (default) overwrites, 'append' adds to the end, 'prepend' adds to the start."),
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
