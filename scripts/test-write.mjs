// Write-path smoke test — exercises the REAL tool handlers (create → update →
// comment → delete) against the live ClickUp API. Self-cleaning: the test task
// is always deleted in `finally`, even if an assertion fails.
//
// Run: node scripts/test-write.mjs [listId]
import "dotenv/config";
import { ClickUpClient } from "../dist/client.js";
import { allTools } from "../dist/tools/index.js";

const token = process.env.CLICKUP_API_TOKEN ?? process.env.CLICKUP_TOKEN ?? "";
if (!token) {
  console.error("✗ CLICKUP_API_TOKEN não encontrado no .env.");
  process.exit(1);
}

const LIST_ID = process.argv[2] ?? "901305685837";
const client = new ClickUpClient({ token, defaultTeamId: process.env.CLICKUP_TEAM_ID });

// Build a name→handler map from the real registry.
const tool = Object.fromEntries(allTools.map((t) => [t.name, t]));
const call = (name, args) => tool[name].handler(args, client);

const ok = (m) => console.log("✓", m);
const fail = (m, e) => console.log("✗", m, "\n   ", e?.message ?? e);

let taskId = null;

try {
  // 0) Who am I — used as the assignee for the REPLACE test.
  const me = await client.get("/user");
  const myId = me.user.id;
  ok(`usuário: ${me.user.username} (id ${myId})`);

  // 1) CREATE — with me as assignee, a tag, priority and a natural-language date.
  const created = await call("create_task", {
    list_id: LIST_ID,
    name: "🧪 clickup-mcp-pro write test",
    description: "Task temporária de teste automatizado. Será deletada.",
    priority: 3,
    assignees: [myId],
    due_date: "tomorrow",
  });
  taskId = created.id;
  ok(`create_task → id ${taskId}, assignees=[${(created.assignees ?? []).map((a) => a.id).join(",")}], due=${created.due_date}`);

  // 2) GET — confirm it's there.
  const fetched = await call("get_task", { task_id: taskId });
  ok(`get_task → "${fetched.name}", status=${fetched.status?.status}, priority=${fetched.priority?.priority}`);

  // 3) UPDATE — change name/priority AND test the new assignees REPLACE semantics
  //    by clearing assignees ([] must remove the current assignee).
  await call("update_task", {
    task_id: taskId,
    name: "🧪 clickup-mcp-pro write test (updated)",
    priority: 1,
    assignees: [],
  });
  const afterUpdate = await call("get_task", { task_id: taskId });
  const remaining = (afterUpdate.assignees ?? []).map((a) => a.id);
  if (remaining.length === 0) ok(`update_task → nome/priority alterados; assignees REPLACE removeu todos ✅ (priority=${afterUpdate.priority?.priority})`);
  else fail(`update_task → assignees REPLACE FALHOU: ainda há [${remaining.join(",")}]`);

  // 4) COMMENT — add and read back.
  const comment = await call("create_task_comment", {
    task_id: taskId,
    comment_text: "Comentário de teste automatizado ✅",
  });
  ok(`create_task_comment → id ${comment.id ?? comment.comment_id ?? "(ok)"}`);
  const comments = await call("get_task_comments", { task_id: taskId });
  ok(`get_task_comments → ${(comments.comments ?? []).length} comentário(s)`);

  // 5) CUSTOM FIELDS — read the list's fields (read-only, just exercises the path).
  const fields = await call("get_list_custom_fields", { list_id: LIST_ID });
  ok(`get_list_custom_fields → ${(fields.fields ?? []).length} campo(s)`);
} catch (e) {
  fail("erro durante o teste", e);
} finally {
  // CLEANUP — always remove the test task.
  if (taskId) {
    try {
      await call("delete_task", { task_id: taskId });
      ok(`delete_task → task ${taskId} removida (cleanup) ✅`);
    } catch (e) {
      fail(`CLEANUP FALHOU — remova manualmente a task ${taskId}`, e);
    }
  }
  console.log("\nTeste de escrita concluído.");
}
