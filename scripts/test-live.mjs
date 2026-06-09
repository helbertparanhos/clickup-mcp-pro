// Live smoke test against the real ClickUp API.
// Reads CLICKUP_API_TOKEN from .env and exercises read-only endpoints.
// Run: node scripts/test-live.mjs
import "dotenv/config";
import { ClickUpClient } from "../dist/client.js";

const token = process.env.CLICKUP_API_TOKEN ?? process.env.CLICKUP_TOKEN ?? "";
if (!token) {
  console.error("✗ CLICKUP_API_TOKEN não encontrado no .env. Cole o token (pk_...) e rode de novo.");
  process.exit(1);
}

const client = new ClickUpClient({ token, defaultTeamId: process.env.CLICKUP_TEAM_ID });

const pass = (m) => console.log(`✓ ${m}`);
const fail = (m, e) => console.log(`✗ ${m}\n    ${e?.message ?? e}`);

let teamId = process.env.CLICKUP_TEAM_ID;
let spaceId, listId;

async function run() {
  // 1) Authorized user
  try {
    const u = await client.get("/user");
    pass(`get_authorized_user → ${u.user?.username} <${u.user?.email}>`);
  } catch (e) {
    fail("get_authorized_user", e);
    return;
  }

  // 2) Workspaces / teams
  try {
    const t = await client.get("/team");
    const teams = t.teams ?? [];
    pass(`get_workspaces → ${teams.length} workspace(s): ${teams.map((x) => `${x.name}(${x.id})`).join(", ")}`);
    if (!teamId && teams[0]) teamId = teams[0].id;
  } catch (e) {
    fail("get_workspaces", e);
  }

  if (!teamId) {
    console.log("… sem teamId; encerrando após checks globais.");
    return;
  }

  // 3) Spaces
  try {
    const s = await client.get(`/team/${teamId}/space`, { params: { archived: false } });
    const spaces = s.spaces ?? [];
    pass(`list_spaces (team ${teamId}) → ${spaces.length} space(s): ${spaces.map((x) => x.name).join(", ")}`);
    spaceId = spaces[0]?.id;
  } catch (e) {
    fail("list_spaces", e);
  }

  // 4) Folders + folderless lists in first space
  if (spaceId) {
    try {
      const f = await client.get(`/space/${spaceId}/folder`, { params: { archived: false } });
      pass(`list_folders (space ${spaceId}) → ${(f.folders ?? []).length} folder(s)`);
      listId = f.folders?.[0]?.lists?.[0]?.id;
    } catch (e) {
      fail("list_folders", e);
    }
    try {
      const l = await client.get(`/space/${spaceId}/list`, { params: { archived: false } });
      pass(`get_folderless_lists (space ${spaceId}) → ${(l.lists ?? []).length} list(s)`);
      listId = listId ?? l.lists?.[0]?.id;
    } catch (e) {
      fail("get_folderless_lists", e);
    }
  }

  // 5) Tasks in first list
  if (listId) {
    try {
      const t = await client.get(`/list/${listId}/task`, { params: { subtasks: true } });
      pass(`get_tasks (list ${listId}) → ${(t.tasks ?? []).length} task(s)`);
    } catch (e) {
      fail("get_tasks", e);
    }
  }

  // 6) Docs (v3)
  try {
    const d = await client.get(`/workspaces/${teamId}/docs`, { version: "v3", params: { limit: 5 } });
    pass(`search_docs (v3) → ${(d.docs ?? []).length} doc(s)`);
  } catch (e) {
    fail("search_docs (v3)", e);
  }

  // 7) Time entries (v2)
  try {
    await client.get(`/team/${teamId}/time_entries`);
    pass(`get_time_entries (team ${teamId}) → ok`);
  } catch (e) {
    fail("get_time_entries", e);
  }

  console.log("\nSmoke test concluído.");
}

run().catch((e) => fail("erro inesperado", e));
