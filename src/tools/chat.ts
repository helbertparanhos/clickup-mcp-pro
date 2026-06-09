import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

/** ClickUp Chat (v3) lives under /workspaces/{teamId}/chat. */
const base = (client: any, teamId?: string) =>
  `/workspaces/${client.resolveTeamId(teamId)}/chat`;

export const chatTools = [
  // ── Channels ──────────────────────────────────────────────────────────────
  defineTool({
    name: "list_chat_channels",
    description: "List Chat channels in a Workspace (v3).",
    schema: z.object({
      team_id: teamIdParam,
      cursor: z.string().optional(),
      limit: z.number().int().optional(),
      is_follower: z.boolean().optional(),
      include_hidden: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const { team_id, ...params } = args;
      return client.get(`${base(client, team_id)}/channels`, { version: "v3", params });
    },
  }),

  defineTool({
    name: "get_chat_channel",
    description: "Get a single Chat channel by id (v3).",
    schema: z.object({ team_id: teamIdParam, channel_id: z.string().describe("Channel ID.") }),
    handler: async (args, client) =>
      client.get(`${base(client, args.team_id)}/channels/${args.channel_id}`, { version: "v3" }),
  }),

  defineTool({
    name: "create_chat_channel",
    description: "Create a Chat channel in a Workspace (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string(),
      description: z.string().optional(),
      topic: z.string().optional(),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
      user_ids: z.array(z.union([z.string(), z.number()])).optional(),
    }),
    handler: async (args, client) => {
      const { team_id, ...body } = args;
      return client.post(`${base(client, team_id)}/channels`, { version: "v3", body });
    },
  }),

  defineTool({
    name: "create_chat_channel_on_location",
    description: "Create a Chat channel attached to a Space, Folder or List (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      parent_id: z.string().describe("Location id (space/folder/list)."),
      parent_type: z.enum(["SPACE", "FOLDER", "LIST"]),
      name: z.string().optional(),
      description: z.string().optional(),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
    }),
    handler: async (args, client) => {
      const { team_id, ...body } = args;
      return client.post(`${base(client, team_id)}/channels/location`, { version: "v3", body });
    },
  }),

  defineTool({
    name: "create_chat_direct_message",
    description: "Create (or fetch) a direct-message channel with one or more users (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      user_ids: z.array(z.union([z.string(), z.number()])).min(1),
    }),
    handler: async (args, client) => {
      const { team_id, user_ids } = args;
      return client.post(`${base(client, team_id)}/channels/direct_message`, {
        version: "v3",
        body: { user_ids },
      });
    },
  }),

  defineTool({
    name: "update_chat_channel",
    description: "Update a Chat channel (name, description, topic, visibility) (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("Channel ID."),
      name: z.string().optional(),
      description: z.string().optional(),
      topic: z.string().optional(),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
      archived: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const { team_id, channel_id, ...body } = args;
      return client.patch(`${base(client, team_id)}/channels/${channel_id}`, {
        version: "v3",
        body,
      });
    },
  }),

  defineTool({
    name: "get_chat_channel_members",
    description: "List members of a Chat channel (v3).",
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("Channel ID."),
      cursor: z.string().optional(),
      limit: z.number().int().optional(),
    }),
    handler: async (args, client) => {
      const { team_id, channel_id, ...params } = args;
      return client.get(`${base(client, team_id)}/channels/${channel_id}/members`, {
        version: "v3",
        params,
      });
    },
  }),

  defineTool({
    name: "get_chat_channel_followers",
    description: "List followers of a Chat channel (v3).",
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("Channel ID."),
      cursor: z.string().optional(),
      limit: z.number().int().optional(),
    }),
    handler: async (args, client) => {
      const { team_id, channel_id, ...params } = args;
      return client.get(`${base(client, team_id)}/channels/${channel_id}/followers`, {
        version: "v3",
        params,
      });
    },
  }),

  // ── Messages ──────────────────────────────────────────────────────────────
  defineTool({
    name: "get_chat_messages",
    description: "List messages in a Chat channel (v3).",
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("Channel ID."),
      cursor: z.string().optional(),
      limit: z.number().int().optional(),
    }),
    handler: async (args, client) => {
      const { team_id, channel_id, ...params } = args;
      return client.get(`${base(client, team_id)}/channels/${channel_id}/messages`, {
        version: "v3",
        params,
      });
    },
  }),

  defineTool({
    name: "send_chat_message",
    description: "Send a message to a Chat channel (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("Channel ID."),
      content: z.string().describe("Message body."),
      content_format: z.enum(["text/md", "text/plain"]).optional(),
      type: z.enum(["message", "post"]).optional(),
      assignee: z.union([z.string(), z.number()]).optional(),
    }),
    handler: async (args, client) => {
      const { team_id, channel_id, ...body } = args;
      return client.post(`${base(client, team_id)}/channels/${channel_id}/messages`, {
        version: "v3",
        body,
      });
    },
  }),

  defineTool({
    name: "update_chat_message",
    description: "Edit a Chat message (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("Message ID."),
      content: z.string().optional(),
      content_format: z.enum(["text/md", "text/plain"]).optional(),
      resolved: z.boolean().optional(),
    }),
    handler: async (args, client) => {
      const { team_id, message_id, ...body } = args;
      return client.patch(`${base(client, team_id)}/messages/${message_id}`, {
        version: "v3",
        body,
      });
    },
  }),

  defineTool({
    name: "delete_chat_message",
    description: "Delete a Chat message (v3).",
    write: true,
    schema: z.object({ team_id: teamIdParam, message_id: z.string().describe("Message ID.") }),
    handler: async (args, client) => {
      await client.del(`${base(client, args.team_id)}/messages/${args.message_id}`, {
        version: "v3",
      });
      return { deleted: true, message_id: args.message_id };
    },
  }),

  // ── Replies ───────────────────────────────────────────────────────────────
  defineTool({
    name: "get_chat_message_replies",
    description: "List replies to a Chat message (v3).",
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("Message ID."),
      cursor: z.string().optional(),
      limit: z.number().int().optional(),
    }),
    handler: async (args, client) => {
      const { team_id, message_id, ...params } = args;
      return client.get(`${base(client, team_id)}/messages/${message_id}/replies`, {
        version: "v3",
        params,
      });
    },
  }),

  defineTool({
    name: "create_chat_message_reply",
    description: "Reply to a Chat message (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("Message ID."),
      content: z.string(),
      content_format: z.enum(["text/md", "text/plain"]).optional(),
    }),
    handler: async (args, client) => {
      const { team_id, message_id, ...body } = args;
      return client.post(`${base(client, team_id)}/messages/${message_id}/replies`, {
        version: "v3",
        body,
      });
    },
  }),

  // ── Reactions & metadata ──────────────────────────────────────────────────
  defineTool({
    name: "get_chat_message_reactions",
    description: "List reactions on a Chat message (v3).",
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("Message ID."),
      cursor: z.string().optional(),
      limit: z.number().int().optional(),
    }),
    handler: async (args, client) => {
      const { team_id, message_id, ...params } = args;
      return client.get(`${base(client, team_id)}/messages/${message_id}/reactions`, {
        version: "v3",
        params,
      });
    },
  }),

  defineTool({
    name: "create_chat_message_reaction",
    description: "Add an emoji reaction to a Chat message (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("Message ID."),
      reaction: z.string().describe("Emoji name, e.g. 'thumbsup'."),
    }),
    handler: async (args, client) => {
      const { team_id, message_id, reaction } = args;
      return client.post(`${base(client, team_id)}/messages/${message_id}/reactions`, {
        version: "v3",
        body: { reaction },
      });
    },
  }),

  defineTool({
    name: "delete_chat_message_reaction",
    description: "Remove an emoji reaction from a Chat message (v3).",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("Message ID."),
      reaction: z.string().describe("Emoji name to remove."),
    }),
    handler: async (args, client) => {
      const { team_id, message_id, reaction } = args;
      await client.del(
        `${base(client, team_id)}/messages/${message_id}/reactions/${encodeURIComponent(reaction)}`,
        { version: "v3" }
      );
      return { removed: true, message_id, reaction };
    },
  }),

  defineTool({
    name: "get_chat_message_tagged_users",
    description: "List users tagged/@-mentioned in a Chat message (v3).",
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("Message ID."),
      cursor: z.string().optional(),
      limit: z.number().int().optional(),
    }),
    handler: async (args, client) => {
      const { team_id, message_id, ...params } = args;
      return client.get(`${base(client, team_id)}/messages/${message_id}/tagged_users`, {
        version: "v3",
        params,
      });
    },
  }),
];
