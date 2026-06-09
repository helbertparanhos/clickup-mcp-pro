import { ClickUpClient } from "./client.js";

/**
 * Lightweight name → ID resolution helpers built on the workspace hierarchy.
 * These let "by name" tools avoid forcing the caller to hunt for IDs.
 *
 * Every resolver returns a discriminated result so ambiguous lookups surface
 * the candidates instead of silently picking the first (and possibly wrong) one.
 */

interface HierarchyNode {
  id: string;
  name: string;
}

export interface ResolveResult<T> {
  /** Unambiguous single match, when found. */
  match?: T;
  /** All candidates considered (for ambiguous or not-found feedback). */
  candidates: T[];
  /** True when more than one candidate matched and none is a unique exact hit. */
  ambiguous: boolean;
}

/** Fetch all spaces in a team. */
export async function listSpaces(client: ClickUpClient, teamId: string) {
  const data = await client.get(`/team/${teamId}/space`, { params: { archived: false } });
  return (data.spaces ?? []) as HierarchyNode[];
}

/** Resolve a space by (case-insensitive) name. */
export async function findSpaceByName(
  client: ClickUpClient,
  teamId: string,
  name: string
): Promise<ResolveResult<HierarchyNode>> {
  return resolveByName(await listSpaces(client, teamId), name);
}

/** Resolve a list by name across a space (folder lists + folderless lists). */
export async function findListInSpace(
  client: ClickUpClient,
  spaceId: string,
  name: string
): Promise<ResolveResult<HierarchyNode>> {
  const [foldered, folderless] = await Promise.all([
    client.get(`/space/${spaceId}/folder`, { params: { archived: false } }),
    client.get(`/space/${spaceId}/list`, { params: { archived: false } }),
  ]);
  const lists: HierarchyNode[] = [];
  for (const folder of foldered.folders ?? []) {
    for (const l of folder.lists ?? []) lists.push(l);
  }
  for (const l of folderless.lists ?? []) lists.push(l);
  return resolveByName(lists, name);
}

/** Resolve a workspace member by name, username, email or id. */
export async function findMember(
  client: ClickUpClient,
  teamId: string,
  query: string
): Promise<ResolveResult<any>> {
  const data = await client.get(`/team`);
  const team = (data.teams ?? []).find((t: any) => String(t.id) === String(teamId));
  const members = (team?.members ?? []).map((m: any) => m.user);
  const q = query.toLowerCase();

  // Exact match on id or email is always unambiguous.
  const exact = members.find(
    (u: any) => String(u.id) === query || String(u.email ?? "").toLowerCase() === q
  );
  if (exact) return { match: exact, candidates: [exact], ambiguous: false };

  // Otherwise fall back to username substring, surfacing ambiguity.
  const partial = members.filter((u: any) =>
    String(u.username ?? "").toLowerCase().includes(q)
  );
  if (partial.length === 1) return { match: partial[0], candidates: partial, ambiguous: false };
  if (partial.length > 1) return { candidates: partial, ambiguous: true };
  return { candidates: [], ambiguous: false };
}

function resolveByName<T extends HierarchyNode>(items: T[], name: string): ResolveResult<T> {
  const q = name.toLowerCase();
  const exact = items.filter((i) => i.name.toLowerCase() === q);
  if (exact.length === 1) return { match: exact[0], candidates: exact, ambiguous: false };
  if (exact.length > 1) return { candidates: exact, ambiguous: true };

  const partial = items.filter((i) => i.name.toLowerCase().includes(q));
  if (partial.length === 1) return { match: partial[0], candidates: partial, ambiguous: false };
  if (partial.length > 1) return { candidates: partial, ambiguous: true };

  return { candidates: [], ambiguous: false };
}
