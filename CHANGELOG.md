# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-06-11

### Changed
- **Documentation quality pass across all 162 tools** — every tool description
  rewritten to state what it does, when to use it, and what it returns; and a
  `.describe()` added to every parameter (including optional and shared ones).
  Improves agent tool-selection accuracy and the Glama Tool Definition Quality
  score. No behavior, tool names, schemas or signatures changed.

## [1.0.0] - 2026-06-09

### Added
- Initial release: **161 typed tools + `clickup_raw`** covering the entire
  ClickUp v2/v3 API.
- Domains: workspace/teams, spaces, folders, lists, tasks (CRUD, bulk,
  links/dependencies, multi-list, custom fields, attachments), comments &
  threads, checklists, tags, custom fields, time tracking, docs (v3), views,
  goals & key results, chat (v3), sprints, webhooks, user groups, guests,
  members/resolvers and task templates.
- `clickup_raw` escape hatch for 100% API coverage of any uncovered endpoint.
- `CLICKUP_READONLY` safe mode that blocks every write while keeping reads.
- Natural-language date parsing (`"tomorrow"`, `"in 3 days"`, `"+2h"`, ISO, epoch).
- Name → ID resolution (`find_member`, `find_space_by_name`, `find_list_by_name`)
  that surfaces candidates on ambiguity instead of guessing.
- Resilient HTTP client: retry with exponential backoff + jitter on 429/5xx,
  `Retry-After` honored, actionable error hints for 401/403/404/429.
- Configuration for Claude Code, Cursor and Claude Desktop.

### Security
- Anti-SSRF on `upload_task_attachment(url)`: HTTPS-only, the validated IP is
  pinned for the connection (defeats DNS rebinding), redirects refused, and the
  body is streamed with a size cap (`CLICKUP_MAX_UPLOAD_BYTES`). Private,
  loopback, link-local, IPv4-mapped IPv6 and NAT64 addresses are rejected.
- `upload_task_attachment(file_path)` can be confined to `CLICKUP_UPLOAD_DIR`.
- `clickup_raw` path sanitization (rejects scheme, host, `..`, `@`) and the tool
  can be disabled entirely via `CLICKUP_DISABLE_RAW`.
- The API token is sent only as an auth header and is never logged.
