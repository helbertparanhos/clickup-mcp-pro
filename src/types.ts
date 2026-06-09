import { z, ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ClickUpClient } from "./client.js";

/** MCP text content result. */
export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export type ToolHandler<S extends ZodTypeAny> = (
  args: z.infer<S>,
  client: ClickUpClient
) => Promise<unknown>;

export interface ToolDef<S extends ZodTypeAny = ZodTypeAny> {
  name: string;
  description: string;
  /** Marks the tool as a write operation — blocked when CLICKUP_READONLY=true. */
  write?: boolean;
  schema: S;
  handler: ToolHandler<S>;
}

/**
 * Schema-erased view of a tool, used for heterogeneous collections/registries
 * where the precise Zod schema of each tool can't be tracked in the array type.
 */
export interface AnyToolDef {
  name: string;
  description: string;
  write?: boolean;
  schema: ZodTypeAny;
  handler: (args: any, client: ClickUpClient) => Promise<unknown>;
}

/**
 * Declares a tool. Centralizes the boilerplate so every tool file stays terse.
 * Handlers just return JS data; serialization to MCP text content is handled
 * by the registry.
 */
export function defineTool<S extends ZodTypeAny>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

/** Build the MCP `tools` listing entry (name/description/inputSchema). */
export function toListing(def: AnyToolDef) {
  const jsonSchema = zodToJsonSchema(def.schema, { target: "jsonSchema7" });
  // The MCP inputSchema must be a plain JSON Schema object.
  return {
    name: def.name,
    description: def.description,
    inputSchema: jsonSchema as Record<string, unknown>,
  };
}

/** Wrap arbitrary data into the MCP text-content result shape. */
export function ok(data: unknown): ToolResult {
  const text =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

// ── Shared Zod fragments ────────────────────────────────────────────────────

export const teamIdParam = z
  .string()
  .optional()
  .describe("Team/Workspace ID. Falls back to CLICKUP_TEAM_ID when omitted.");

export const customTaskIdsParam = z
  .object({
    custom_task_ids: z
      .boolean()
      .optional()
      .describe("Treat task_id as a custom task id (requires team_id)."),
    team_id: z
      .string()
      .optional()
      .describe("Required when custom_task_ids is true."),
  })
  .partial();

/**
 * Parse a human/relative date into a Unix epoch in milliseconds (ClickUp's
 * format). Accepts:
 *  - a number (already epoch ms) or numeric string
 *  - ISO 8601 strings ("2026-06-10", "2026-06-10T17:00:00Z")
 *  - simple relative expressions: "today", "tomorrow", "yesterday",
 *    "in 3 days", "in 2 weeks", "next monday", "+2h", "-30m"
 */
export function toEpochMs(input: string | number | undefined): number | undefined {
  if (input === undefined || input === null || input === "") return undefined;
  if (typeof input === "number") return input;

  const trimmed = String(input).trim();

  // Pure number → epoch. Values with <= ~10 digits look like seconds (e.g. a
  // current Unix-seconds timestamp ≈ 1.7e9) and are upscaled to ms; 13-digit
  // millisecond timestamps (≈ 1.7e12) are kept as-is. The 1e11 boundary sits
  // between the two so realistic dates are never misclassified.
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return n < 1e11 ? n * 1000 : n;
  }

  const now = new Date();
  const lower = trimmed.toLowerCase();

  const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };

  if (lower === "now") return now.getTime();
  if (lower === "today") return startOfDay(now).getTime();
  if (lower === "tomorrow") {
    const d = startOfDay(now);
    d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  if (lower === "yesterday") {
    const d = startOfDay(now);
    d.setDate(d.getDate() - 1);
    return d.getTime();
  }

  // "+2h" / "-30m" / "+3d" / "+1w" relative to now
  const rel = lower.match(/^([+-])\s*(\d+)\s*(m|min|h|hour|hours|d|day|days|w|week|weeks)$/);
  if (rel) {
    const sign = rel[1] === "-" ? -1 : 1;
    const amount = Number(rel[2]) * sign;
    const unit = rel[3];
    const d = new Date(now);
    if (unit.startsWith("m")) d.setMinutes(d.getMinutes() + amount);
    else if (unit.startsWith("h")) d.setHours(d.getHours() + amount);
    else if (unit.startsWith("d")) d.setDate(d.getDate() + amount);
    else if (unit.startsWith("w")) d.setDate(d.getDate() + amount * 7);
    return d.getTime();
  }

  // "in N days/weeks/hours"
  const inN = lower.match(/^in\s+(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks)$/);
  if (inN) {
    const amount = Number(inN[1]);
    const unit = inN[2];
    const d = new Date(now);
    if (unit.startsWith("minute")) d.setMinutes(d.getMinutes() + amount);
    else if (unit.startsWith("hour")) d.setHours(d.getHours() + amount);
    else if (unit.startsWith("day")) d.setDate(d.getDate() + amount);
    else if (unit.startsWith("week")) d.setDate(d.getDate() + amount * 7);
    return d.getTime();
  }

  // "next monday" ... "next sunday"
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextDay = lower.match(/^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (nextDay) {
    const target = days.indexOf(nextDay[1]);
    const d = startOfDay(now);
    let delta = (target - d.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    d.setDate(d.getDate() + delta);
    return d.getTime();
  }

  // Fallback: native Date parser (ISO and many common formats)
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) return parsed;

  throw new Error(
    `Could not parse date "${input}". Use ISO (2026-06-10T17:00), epoch ms, or relative ("tomorrow", "in 3 days", "+2h").`
  );
}

/** Zod schema for a date-ish field that accepts string or number. */
export const dateInput = z
  .union([z.string(), z.number()])
  .describe('Date as ISO string, epoch ms, or relative ("tomorrow", "in 3 days", "+2h").');
