# Test Report — ClickUp MCP Pro v1.0.0

**Date:** 2026-06-09
**Environment:** Node 18+ · Windows 11
**Server:** `node dist/index.js` (162 tools loaded, READONLY off for write tests)
**Method:** real tool handlers exercised against the live ClickUp API
(`scripts/test-live.mjs` for reads, `scripts/test-write.mjs` for the write cycle).

## Read path (live, READONLY)

| Tool | Status | Notes |
|------|--------|-------|
| `get_authorized_user` | ✅ OK | Returned token owner |
| `get_workspaces` | ✅ OK | 2 workspaces |
| `list_spaces` | ✅ OK | 5 spaces |
| `list_folders` | ✅ OK | folders listed |
| `get_folderless_lists` | ✅ OK | lists listed |
| `get_tasks` | ✅ OK | 100 tasks returned (pagination/parse) |
| `search_docs` (v3) | ✅ OK | 5 docs (v3 API) |
| `get_time_entries` | ✅ OK | — |
| `get_list_custom_fields` | ✅ OK | 8 fields |

## Write path (live, self-cleaning create → update → comment → delete)

| Tool | Status | Notes |
|------|--------|-------|
| `create_task` | ✅ OK | Created with assignee, priority, and NL date `"tomorrow"` → correct epoch |
| `get_task` | ✅ OK | Fields verified |
| `update_task` | ✅ OK | Name/priority changed; **assignees REPLACE** verified (`assignees: []` removed the existing assignee) |
| `create_task_comment` | ✅ OK | Comment created |
| `get_task_comments` | ✅ OK | 1 comment read back |
| `delete_task` | ✅ OK | Test task removed in cleanup |

## Security guards (unit-tested)

| Guard | Status | Notes |
|-------|--------|-------|
| Anti-SSRF (`fetchPublicHttpsToBuffer`) | ✅ OK | Blocks http, localhost, private IPs, metadata IP, IPv4-mapped IPv6 (hex + dotted), NAT64; allows public HTTPS (real 8.4 KB download) |
| Size cap (streamed) | ✅ OK | Aborts when body exceeds limit |
| Upload path allowlist (`CLICKUP_UPLOAD_DIR`) | ✅ OK | Rejects paths outside the dir; allows inside |
| `clickup_raw` path sanitizer | ✅ OK | Rejects `..`, `//`, `://`, `@`, missing leading `/` |
| Readonly gate | ✅ OK | Blocks writes; allows only `clickup_raw` GET (no lowercase bypass) |

## Summary

- **Read tools tested live:** 9/9 ✅
- **Write cycle tested live:** 6/6 ✅ (auto-reverted, nothing left behind)
- **Security guards:** 5/5 ✅
- The remaining typed tools follow the same thin-handler pattern over the shared,
  live-validated client (v2 + v3 paths both exercised). Destructive/Enterprise-only
  tools (guests, bulk delete, webhooks delete) are validated by review rather than
  run against production data.

See [REVIEW.md](REVIEW.md) for the full code + security audit and resolutions.
