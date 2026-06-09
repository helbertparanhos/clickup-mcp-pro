# ClickUp MCP Pro

> The most complete **ClickUp** MCP server — **161 typed tools + `clickup_raw`** covering the entire ClickUp v2/v3 API. Built to match or beat the paid alternatives, free and open source.

[![npm](https://img.shields.io/npm/v/clickup-mcp-pro.svg?style=flat-square)](https://www.npmjs.com/package/clickup-mcp-pro)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/helbertparanhos/clickup-mcp-pro?style=flat-square)](https://github.com/helbertparanhos/clickup-mcp-pro/stargazers)

ClickUp MCP Pro exposes nearly every ClickUp operation as a typed [Model Context Protocol](https://modelcontextprotocol.io) tool — so Claude Code (and any MCP client) can drive your entire workspace: tasks, lists, folders, spaces, docs, chat, goals, sprints, time tracking, custom fields, webhooks, guests and more. When a niche endpoint isn't wrapped, `clickup_raw` reaches the rest of the API directly, giving you **100% coverage**.

## Highlights

- **161 typed tools** across 23 ClickUp domains (v2 + v3 APIs).
- **`clickup_raw` escape hatch** — call any endpoint not yet wrapped. Nothing is out of reach.
- **Readonly mode** (`CLICKUP_READONLY=true`) blocks every write while keeping reads working — safe exploration.
- **Natural-language dates** — `"tomorrow"`, `"in 3 days"`, `"+2h"`, ISO, or epoch ms all work for any date field.
- **Name → ID resolution** — `find_member`, `find_space_by_name`, `find_list_by_name`.
- **Resilient client** — automatic retries with backoff on 429/5xx, `Retry-After` honored, actionable error messages.
- **Bulk operations** with per-item success/error reporting (partial failures never lose the batch).

## Coverage at a glance

| Domain | Tools | Domain | Tools |
|--------|:----:|--------|:----:|
| Workspace / Teams | 6 | Time tracking | 14 |
| Spaces | 5 | Docs (v3) | 8 |
| Folders | 7 | Views | 7 |
| Lists | 9 | Goals & Key Results | 8 |
| Tasks (core) | 11 | Chat (v3) | 18 |
| Tasks (bulk) | 4 | Sprints | 3 |
| Task links & dependencies | 6 | Webhooks | 4 |
| Comments & threads | 10 | User groups | 4 |
| Checklists | 6 | Guests (Enterprise) | 10 |
| Attachments | 2 | Members & resolvers | 5 |
| Tags | 6 | Templates | 2 |
| Custom fields | 6 | **`clickup_raw`** | 1 |

## Install & configure

### 1. Get a ClickUp Personal API Token
ClickUp → **Settings → Apps → API Token** (it starts with `pk_`).

### 2. Add to Claude Code

```json
{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": ["-y", "clickup-mcp-pro"],
      "env": {
        "CLICKUP_API_TOKEN": "pk_your_token_here",
        "CLICKUP_TEAM_ID": "9007012345"
      }
    }
  }
}
```

Or, running from source:

```json
{
  "mcpServers": {
    "clickup": {
      "command": "node",
      "args": ["d:/GitHub/easypanel-mcp/projects/clickup-mcp-pro/dist/index.js"],
      "env": { "CLICKUP_API_TOKEN": "pk_your_token_here" }
    }
  }
}
```

### 3. Claude Desktop
File: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or
`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) — same `mcpServers` block as above.

## Environment variables

| Variable | Required | Default | Description |
|----------|:-------:|---------|-------------|
| `CLICKUP_API_TOKEN` | ✅ | — | Personal API token (`pk_...`). `CLICKUP_TOKEN` is also accepted. |
| `CLICKUP_TEAM_ID` | — | — | Default Team/Workspace id used when a tool omits `team_id`. |
| `CLICKUP_READONLY` | — | `false` | `true` blocks all writes (reads still work). |
| `CLICKUP_DISABLE_RAW` | — | `false` | `true` hides the `clickup_raw` tool. |
| `CLICKUP_UPLOAD_DIR` | — | — | Restrict `upload_task_attachment(file_path)` to this base directory. |
| `CLICKUP_MAX_UPLOAD_BYTES` | — | `52428800` | Max attachment size (50 MB) for uploads. |
| `CLICKUP_TIMEOUT_MS` | — | `60000` | Per-request timeout. |
| `CLICKUP_MAX_RETRIES` | — | `3` | Max retries on 429/5xx/network errors. |

## Security notes

This server runs locally and acts on behalf of your token, so it's hardened against the usual ways a malicious prompt could abuse a tool call:

- **`upload_task_attachment(url)`** only fetches **HTTPS** URLs and rejects hosts that resolve to private/loopback/link-local addresses (anti-SSRF), following no redirects.
- **`upload_task_attachment(file_path)`** can be confined to a directory with `CLICKUP_UPLOAD_DIR` to prevent arbitrary local-file exfiltration. Uploads are size-capped (`CLICKUP_MAX_UPLOAD_BYTES`). Note: don't place symlinks pointing outside the directory inside `CLICKUP_UPLOAD_DIR`.
- **`clickup_raw`** validates the path (must be a clean relative API path — no scheme, host, `..` or `@`) and is blocked for writes under `CLICKUP_READONLY=true`. Set `CLICKUP_DISABLE_RAW=true` to remove it entirely in untrusted environments.
- The API token is sent only as an auth header and is **never logged** or echoed in error messages.

## Build from source

```bash
cd projects/clickup-mcp-pro
npm install
npm run build
# Inspect interactively:
npm run inspector
```

## Tool reference

### Workspace / Teams
`get_workspaces`, `get_workspace_seats`, `get_workspace_plan`, `get_workspace_members`, `get_custom_task_types`, `get_authorized_user`

### Spaces
`list_spaces`, `get_space`, `create_space`, `update_space`, `delete_space`, `get_space_tags`

### Folders
`list_folders`, `get_folder`, `create_folder`, `create_folder_from_template`, `update_folder`, `delete_folder`, `get_folder_views`

### Lists
`get_lists_in_folder`, `get_folderless_lists`, `get_list`, `create_list_in_folder`, `create_folderless_list`, `create_list_from_template_in_folder`, `update_list`, `delete_list`, `get_list_views`

### Tasks
`get_tasks`, `get_task`, `get_workspace_tasks`, `create_task`, `update_task`, `delete_task`, `get_subtasks`, `duplicate_task`, `set_task_custom_field_value`, `remove_task_custom_field_value`, `get_task_members`
Bulk: `create_bulk_tasks`, `update_bulk_tasks`, `delete_bulk_tasks`, `move_bulk_tasks`
Links & deps: `add_task_link`, `delete_task_link`, `add_task_dependency`, `delete_task_dependency`, `add_task_to_list`, `remove_task_from_list`

### Comments
`get_task_comments`, `create_task_comment`, `get_list_comments`, `create_list_comment`, `get_chat_view_comments`, `create_chat_view_comment`, `update_comment`, `delete_comment`, `get_threaded_comments`, `create_threaded_comment`

### Checklists
`create_checklist`, `edit_checklist`, `delete_checklist`, `create_checklist_item`, `edit_checklist_item`, `delete_checklist_item`

### Attachments
`upload_task_attachment` (local path / URL / base64), `list_task_attachments`

### Tags & Custom fields
`get_space_tags`, `create_space_tag`, `update_space_tag`, `delete_space_tag`, `add_tag_to_task`, `remove_tag_from_task`
`get_list_custom_fields`, `get_folder_custom_fields`, `get_space_custom_fields`, `get_workspace_custom_fields`, `set_custom_field_value`, `remove_custom_field_value`

### Time tracking
`get_time_entries`, `get_time_entry`, `get_running_time_entry`, `start_time_entry`, `stop_time_entry`, `create_time_entry`, `update_time_entry`, `delete_time_entry`, `get_time_entry_history`, `get_all_time_entry_tags`, `add_tags_to_time_entries`, `remove_tags_from_time_entries`, `get_task_time_in_status`, `get_bulk_tasks_time_in_status`

### Docs (v3)
`search_docs`, `get_doc`, `create_doc`, `get_doc_page_listing`, `get_doc_pages`, `get_doc_page`, `create_doc_page`, `update_doc_page` (replace/append/prepend)

### Views
`get_team_views`, `get_space_views`, `get_view`, `get_view_tasks`, `create_view`, `update_view`, `delete_view`

### Goals
`get_goals`, `get_goal`, `create_goal`, `update_goal`, `delete_goal`, `create_key_result`, `update_key_result`, `delete_key_result`

### Chat (v3)
`list_chat_channels`, `get_chat_channel`, `create_chat_channel`, `create_chat_channel_on_location`, `create_chat_direct_message`, `update_chat_channel`, `get_chat_channel_members`, `get_chat_channel_followers`, `get_chat_messages`, `send_chat_message`, `update_chat_message`, `delete_chat_message`, `get_chat_message_replies`, `create_chat_message_reply`, `get_chat_message_reactions`, `create_chat_message_reaction`, `delete_chat_message_reaction`, `get_chat_message_tagged_users`

### Sprints / Webhooks / User groups / Guests / Templates
`list_sprints`, `get_active_sprint`, `get_sprint_tasks`
`list_webhooks`, `create_webhook`, `update_webhook`, `delete_webhook`
`list_user_groups`, `create_user_group`, `update_user_group`, `delete_user_group`
`invite_guest`, `get_guest`, `edit_guest`, `remove_guest`, `add_guest_to_task`, `remove_guest_from_task`, `add_guest_to_list`, `remove_guest_from_list`, `add_guest_to_folder`, `remove_guest_from_folder`
`get_task_templates`, `create_task_from_template`

### Members & resolvers
`get_task_assignable_members`, `get_list_members`, `find_member`, `find_space_by_name`, `find_list_by_name`

### Escape hatch
`clickup_raw` — call any ClickUp v2/v3 endpoint directly. Example:
```json
{ "method": "GET", "path": "/team/9007012345/space", "version": "v2" }
```

## How it compares

| | ClickUp MCP Pro | taazkareem (paid) | Nazruden | DiversioTeam |
|---|:--:|:--:|:--:|:--:|
| Typed tools | **161** | ~150 | ~30 | ~28 |
| Raw escape hatch | ✅ | — | — | — |
| Readonly mode | ✅ | — | — | — |
| Chat / Goals / Sprints | ✅ | ✅ | — | — |
| Docs (v3) | ✅ | ✅ | ✅ | — |
| Time tracking | ✅ | ✅ | — | partial |
| Price | **Free / MIT** | Paid | Free | Free |

## License

MIT © Helbert Paranhos / [Strat Academy](https://stratacademy.com.br)

- GitHub: [@helbertparanhos](https://github.com/helbertparanhos)
- Built with the [Strat Builder](https://github.com/helbertparanhos) meta-system.
