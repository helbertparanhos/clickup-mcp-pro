import { z } from "zod";
import { defineTool } from "../types.js";
import { assertSafeRawPath } from "../security.js";

/**
 * Escape hatch: call ANY ClickUp v2/v3 endpoint not covered by a typed tool.
 * This guarantees 100% API coverage even for brand-new or niche endpoints.
 */
export const rawTool = defineTool({
  name: "clickup_raw",
  description:
    "Call any ClickUp REST endpoint directly (escape hatch for full API coverage). " +
    "Provide the HTTP method, the path AFTER the version segment (e.g. '/team' or '/task/abc123'), " +
    "the api version ('v2' default, or 'v3' for Docs/Chat), optional query params and JSON body. " +
    "Use this only when no dedicated tool exists. Auth, retries and rate-limiting are handled for you. " +
    "Reference: https://developer.clickup.com/reference",
  // Treated as a write so it's blocked in readonly mode unless method is GET (checked in handler).
  write: true,
  schema: z.object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("HTTP method."),
    path: z
      .string()
      .describe("Path after the version, starting with '/'. Example: '/team/123/space'."),
    version: z.enum(["v2", "v3"]).optional().describe("API version. Default v2."),
    params: z.record(z.any()).optional().describe("Query string parameters."),
    body: z.any().optional().describe("Request body (for POST/PUT/PATCH)."),
  }),
  handler: async (args, client) => {
    assertSafeRawPath(args.path);
    return client.request(args.method, args.path, {
      version: args.version ?? "v2",
      params: args.params,
      body: args.body,
    });
  },
});

/** clickup_raw GET calls should be allowed even in readonly mode. */
export function isRawReadOnly(args: unknown): boolean {
  return (
    typeof args === "object" &&
    args !== null &&
    (args as { method?: string }).method === "GET"
  );
}
