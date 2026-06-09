#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { ClickUpClient } from "./client.js";
import { AnyToolDef, toListing, ok } from "./types.js";
import { allTools, rawTool } from "./tools/index.js";
import { isRawReadOnly } from "./tools/raw.js";

// ── Configuration from environment ──────────────────────────────────────────
const token = process.env.CLICKUP_API_TOKEN ?? process.env.CLICKUP_TOKEN ?? "";
const readonly = String(process.env.CLICKUP_READONLY ?? "").toLowerCase() === "true";
const disableRaw = String(process.env.CLICKUP_DISABLE_RAW ?? "").toLowerCase() === "true";

if (!token) {
  console.error(
    "[clickup-mcp-pro] CLICKUP_API_TOKEN is not set. " +
      "Get a Personal Token at ClickUp → Settings → Apps → API Token."
  );
  process.exit(1);
}

const client = new ClickUpClient({
  token,
  defaultTeamId: process.env.CLICKUP_TEAM_ID,
  timeoutMs: process.env.CLICKUP_TIMEOUT_MS ? Number(process.env.CLICKUP_TIMEOUT_MS) : undefined,
  maxRetries: process.env.CLICKUP_MAX_RETRIES ? Number(process.env.CLICKUP_MAX_RETRIES) : undefined,
});

// ── Assemble the active tool set ─────────────────────────────────────────────
const active: AnyToolDef[] = [...allTools];
if (!disableRaw) active.push(rawTool);

const byName = new Map<string, AnyToolDef>();
for (const t of active) {
  if (byName.has(t.name)) {
    console.error(`[clickup-mcp-pro] Duplicate tool name detected: ${t.name}`);
    process.exit(1);
  }
  byName.set(t.name, t);
}

const listing = active.map(toListing);

// ── Server ───────────────────────────────────────────────────────────────────
const server = new Server(
  { name: "clickup-mcp-pro", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listing }));

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const def = byName.get(request.params.name);
  if (!def) {
    throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${request.params.name}`);
  }

  const rawArgs = request.params.arguments ?? {};

  // Readonly gate — block writes, but always allow clickup_raw GETs.
  if (readonly && def.write) {
    const isRawGet = def.name === "clickup_raw" && isRawReadOnly(rawArgs);
    if (!isRawGet) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              `Blocked: '${def.name}' is a write operation and CLICKUP_READONLY=true. ` +
              `Unset CLICKUP_READONLY to enable writes.`,
          },
        ],
      };
    }
  }

  // Validate args against the tool's Zod schema for actionable error messages.
  const parsed = def.schema.safeParse(rawArgs);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return {
      isError: true,
      content: [{ type: "text", text: `Invalid arguments for '${def.name}': ${issues}` }],
    };
  }

  try {
    const result = await def.handler(parsed.data, client);
    return ok(result) as CallToolResult;
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: error?.message ?? String(error) }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[clickup-mcp-pro] ready — ${active.length} tools` +
      `${readonly ? " (READONLY)" : ""}${disableRaw ? " (raw disabled)" : ""}.`
  );
}

main().catch((err) => {
  console.error("[clickup-mcp-pro] fatal:", err);
  process.exit(1);
});
