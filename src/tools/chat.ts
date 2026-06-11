import { z } from "zod";
import { defineTool, teamIdParam } from "../types.js";

/** ClickUp Chat (v3) lives under /workspaces/{teamId}/chat. */
const base = (client: any, teamId?: string) =>
  `/workspaces/${client.resolveTeamId(teamId)}/chat`;

const cursorParam = z.string().optional().describe("Pagination cursor (the `next_cursor` returned by a previous call). Omit for the first page.");
const limitParam = z.number().int().optional().describe("Maximum number of items to return in this page.");

export const chatTools = [
  // ── Channels ──────────────────────────────────────────────────────────────
  defineTool({
    name: "list_chat_channels",
    description:
      "List the Chat channels in a Workspace (ClickUp Chat v3), with each channel's id, name, type and visibility. Use to discover a `channel_id` before reading or sending messages. Paginated via `cursor`/`limit`.",
    schema: z.object({
      team_id: teamIdParam,
      cursor: cursorParam,
      limit: limitParam,
      is_follower: z.boolean().optional().describe("If true, only return channels the current user follows."),
      include_hidden: z.boolean().optional().describe("If true, also include hidden channels."),
    }),
    handler: async (args, client) => {
      const { team_id, ...params } = args;
      return client.get(`${base(client, team_id)}/channels`, { version: "v3", params });
    },
  }),

  defineTool({
    name: "get_chat_channel",
    description:
      "Get a single Chat channel by id (ClickUp Chat v3) — its name, description, topic, visibility and location. Use to inspect a channel's settings.",
    schema: z.object({ team_id: teamIdParam, channel_id: z.string().describe("ID of the Chat channel to fetch.") }),
    handler: async (args, client) =>
      client.get(`${base(client, args.team_id)}/channels/${args.channel_id}`, { version: "v3" }),
  }),

  defineTool({
    name: "create_chat_channel",
    description:
      "Create a standalone Chat channel in a Workspace (ClickUp Chat v3), optionally with a description, topic, visibility and initial members. Returns the created channel with its id.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      name: z.string().describe("Name of the new channel."),
      description: z.string().optional().describe("Optional channel description."),
      topic: z.string().optional().describe("Optional channel topic shown in the header."),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional().describe("PUBLIC = anyone in the Workspace can join; PRIVATE = invite only."),
      user_ids: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe("User ids to add as initial members of the channel."),
    }),
    handler: async (args, client) => {
      const { team_id, ...body } = args;
      return client.post(`${base(client, team_id)}/channels`, { version: "v3", body });
    },
  }),

  defineTool({
    name: "create_chat_channel_on_location",
    description:
      "Create a Chat channel attached to a specific Space, Folder or List (ClickUp Chat v3), so the conversation is tied to that location. Returns the created channel.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      parent_id: z.string().describe("ID of the location to attach the channel to (a Space, Folder or List id)."),
      parent_type: z.enum(["SPACE", "FOLDER", "LIST"]).describe("Type of the location given in `parent_id`."),
      name: z.string().optional().describe("Optional channel name. Defaults to the location's name."),
      description: z.string().optional().describe("Optional channel description."),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional().describe("PUBLIC = anyone in the Workspace can join; PRIVATE = invite only."),
    }),
    handler: async (args, client) => {
      const { team_id, ...body } = args;
      return client.post(`${base(client, team_id)}/channels/location`, { version: "v3", body });
    },
  }),

  defineTool({
    name: "create_chat_direct_message",
    description:
      "Create (or fetch the existing) direct-message channel with one or more users (ClickUp Chat v3). Returns the DM channel. Use before sending a private message to specific people.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      user_ids: z
        .array(z.union([z.string(), z.number()]))
        .min(1)
        .describe("User ids to include in the direct-message conversation (1 for a 1:1 DM, more for a group DM)."),
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
    description:
      "Update a Chat channel's name, description, topic, visibility or archived state (ClickUp Chat v3). Only the provided fields change. Returns the updated channel.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("ID of the channel to update."),
      name: z.string().optional().describe("New channel name. Omit to keep current."),
      description: z.string().optional().describe("New description. Omit to keep current."),
      topic: z.string().optional().describe("New topic. Omit to keep current."),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional().describe("Change visibility to PUBLIC or PRIVATE."),
      archived: z.boolean().optional().describe("Set true to archive the channel, false to unarchive it."),
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
    description:
      "List the members of a Chat channel (ClickUp Chat v3), with their user ids and names. Paginated via `cursor`/`limit`. Use to see who is in a channel.",
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("ID of the channel whose members to list."),
      cursor: cursorParam,
      limit: limitParam,
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
    description:
      "List the followers of a Chat channel (ClickUp Chat v3) — users who receive notifications without necessarily being members. Paginated via `cursor`/`limit`.",
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("ID of the channel whose followers to list."),
      cursor: cursorParam,
      limit: limitParam,
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
    description:
      "List the messages in a Chat channel, newest first (ClickUp Chat v3). Returns each message's id, content, author and timestamp. Paginated via `cursor`/`limit`. Use to read a channel's history.",
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("ID of the channel whose messages to read."),
      cursor: cursorParam,
      limit: limitParam,
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
    description:
      "Send a new message to a Chat channel (ClickUp Chat v3). Optionally assign it (turning it into an actionable item) and choose message vs. post type. Returns the created message with its id.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      channel_id: z.string().describe("ID of the channel to post in."),
      content: z.string().describe("Message body text. Format is set by `content_format`."),
      content_format: z.enum(["text/md", "text/plain"]).optional().describe("Format of `content`: 'text/md' (markdown) or 'text/plain'."),
      type: z.enum(["message", "post"]).optional().describe("'message' for a normal chat message, 'post' for a rich post. Defaults to 'message'."),
      assignee: z.union([z.string(), z.number()]).optional().describe("User id to assign the message to, making it an action item for them."),
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
    description:
      "Edit a Chat message's content and/or mark it resolved (ClickUp Chat v3). Only the provided fields change. Returns the updated message.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("ID of the message to edit."),
      content: z.string().optional().describe("New message body. Omit to keep current."),
      content_format: z.enum(["text/md", "text/plain"]).optional().describe("Format of `content`: 'text/md' (markdown) or 'text/plain'."),
      resolved: z.boolean().optional().describe("Set true to mark the message resolved, false to reopen it."),
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
    description:
      "Permanently delete a Chat message by id (ClickUp Chat v3). This cannot be undone. Returns a confirmation with the deleted message id.",
    write: true,
    schema: z.object({ team_id: teamIdParam, message_id: z.string().describe("ID of the message to delete.") }),
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
    description:
      "List the threaded replies to a Chat message (ClickUp Chat v3). Returns each reply's id, content, author and timestamp. Paginated via `cursor`/`limit`.",
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("ID of the parent message whose replies to list."),
      cursor: cursorParam,
      limit: limitParam,
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
    description:
      "Reply to a Chat message, creating a threaded response under it (ClickUp Chat v3). Returns the created reply with its id.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("ID of the parent message to reply to."),
      content: z.string().describe("Reply body text. Format is set by `content_format`."),
      content_format: z.enum(["text/md", "text/plain"]).optional().describe("Format of `content`: 'text/md' (markdown) or 'text/plain'."),
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
    description:
      "List the emoji reactions on a Chat message (ClickUp Chat v3), with who reacted and which emoji. Paginated via `cursor`/`limit`.",
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("ID of the message whose reactions to list."),
      cursor: cursorParam,
      limit: limitParam,
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
    description:
      "Add an emoji reaction to a Chat message (ClickUp Chat v3). Returns the created reaction. Use to react with 👍, ✅, etc.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("ID of the message to react to."),
      reaction: z.string().describe("Emoji name to add, e.g. 'thumbsup', 'tada', 'eyes'."),
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
    description:
      "Remove a specific emoji reaction (added by the current user) from a Chat message (ClickUp Chat v3). Returns a confirmation.",
    write: true,
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("ID of the message to remove the reaction from."),
      reaction: z.string().describe("Emoji name to remove, e.g. 'thumbsup'."),
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
    description:
      "List the users @-mentioned/tagged in a Chat message (ClickUp Chat v3), with their ids and names. Paginated via `cursor`/`limit`.",
    schema: z.object({
      team_id: teamIdParam,
      message_id: z.string().describe("ID of the message whose tagged users to list."),
      cursor: cursorParam,
      limit: limitParam,
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
