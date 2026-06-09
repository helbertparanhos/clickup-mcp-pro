# 🔍 Relatório de Qualidade — clickup-mcp-pro

**Data:** 2026-06-09 · MCP TypeScript · 161 tools + `clickup_raw`
**Auditores:** code-reviewer + security-reviewer (threshold 80% confiança)

## Resumo Executivo

| Dimensão | Status | Findings |
|----------|--------|----------|
| Segurança | 🚨 | 1 crítico, 3 médios, 4 notas |
| Qualidade de código | ⚠️ | 0 crítico, 2 altos, 4 médios, 4 baixos |
| Padrões MCP | ✅ | Conformes (gate readonly, validação Zod, dedupe de nomes) |
| Documentação | ✅ | README completo; ajustar contagem "155+" → 161 |

## Certificado: ⚠️ APROVADO COM RESSALVAS (uso local/dev) · 🚫 NÃO publicar até mitigar M1/M2

---

## 🚨 Crítico (segurança)

**C1 — Token real do ClickUp no `.env` em disco.** Personal Token funcional com permissões totais do usuário. Mitigantes confirmados: `.env` no `.gitignore`, pasta ainda não é repo git, `package.json` não empacota `.env`. Não vazou. **Ação: rotacionar o token após os testes.** Não é defeito de código.

## 🟠 Alto (qualidade)

- **#1 — `update_task` com `assignees` nunca remove os antigos** (`tasks.ts:155`). `{add: assignees, rem: []}` → reatribuição mantém responsáveis antigos.
- **#10 — `delete_task_dependency` sem guarda** (`task-links.ts:73`). Falta `if (!depends_on && !dependency_of) throw`.

## 🟡 Médio

**Segurança:**
- **M1 — SSRF em `upload_task_attachment` (url)** (`attachments.ts:34`). `fetch(url)` sem validação.
- **M2 — Leitura de arquivo arbitrário (`file_path`)** (`attachments.ts:31`). `readFile` livre → exfiltração.
- **M3 — `clickup_raw` sem sanitização de path** (`raw.ts`). Gate readonly robusto (sem bypass). Mitigável via `CLICKUP_DISABLE_RAW`.

**Qualidade:**
- **#3** — bulk sem `.max()` nos arrays (`tasks-bulk.ts`).
- **#4** — `assignee` múltiplo inconsistente com a descrição (`time-tracking.ts`).
- **#5** — `list_user_groups` group_ids array vs CSV (`user-groups.ts`).
- **#6** — `find_member`/`matchByName` substring pode casar usuário errado (`resolve.ts`).

## 🟢 Baixo
- **#7** — `version:"v2"` redundante (`folders.ts:52`).
- **#8** — contagem "155+" no package.json vs 161 real.
- **#9** — heurística epoch <1e12 multiplica por 1000 (`types.ts:99`).

## ✅ Pontos fortes
Client resiliente (retry/backoff/Retry-After/hints 401-429); readonly gate à prova de bypass (testado lowercase + ordem); `defineTool` enxuto + dedupe no boot; bulk com partial-failure reporting; `encodeURIComponent` nos paths; token nunca logado (header-only); `formatError` não vaza credencial; `package.json files[]` não inclui `.env`/scripts.

## Veredito
Código maduro, sem bugs críticos. Bloqueadores para publicação: **M1 (SSRF)** e **M2 (path traversal)**, + os 2 altos comportamentais (#1, #10). Resolver via `/improve` e re-revisar.

---

## ✅ Resolução (rodada de /improve — 2026-06-09)

Todos os findings tratados e validados (build limpo + smoke test ao vivo 8/8 + unit-tests dos guards):

| Finding | Status | Como |
|---|---|---|
| C1 (token no .env) | ⚠️ Operacional | `.env` gitignored e não-empacotado; rotacionar após testes |
| #1 assignees update | ✅ Corrigido | Semântica REPLACE: lê assignees atuais e calcula `rem` |
| #10 delete_dependency | ✅ Corrigido | Guarda `if(!depends_on && !dependency_of) throw` |
| M1 SSRF (url) | ✅ Corrigido | HTTPS-only + IP-pinned (anti-rebinding) + sem redirect (`fetchPublicHttpsToBuffer`) |
| M2 path traversal | ✅ Corrigido | `assertSafeUploadPath` + allowlist `CLICKUP_UPLOAD_DIR` |
| M3 raw path | ✅ Corrigido | `assertSafeRawPath` (rejeita `..`, `//`, `://`, `@`) |
| #3 bulk size | ✅ Corrigido | `.max(100)` nos arrays |
| #4/#5 CSV params | ✅ Corrigido | `assignee`/`group_ids` aceitam array → join |
| #6 find_member | ✅ Corrigido | retorna `{match,candidates,ambiguous}` |
| #7/#8/#9 baixos | ✅ Corrigido | version redundante, contagem 161, heurística epoch 1e11 |

### Re-revisão de segurança (2ª rodada) — findings adicionais corrigidos
- **C1-bis (crítico): bypass SSRF via IPv4-mapped IPv6 hex** (`::ffff:a9fe:a9fe` = 169.254.169.254). ✅ Corrigido — `isPrivateAddress` agora decodifica a forma hex e a dotted, + bloqueia NAT64.
- **M1-bis: DNS rebinding (TOCTOU)** entre lookup e fetch. ✅ Corrigido — conexão pinada ao IP validado (SNI/Host preservados).
- **M2-bis: size via content-length forjável.** ✅ Corrigido — streaming com `controller`/abort ao exceder `MAX_ATTACHMENT_BYTES`.

**Certificado atualizado: 🏆 APROVADO PARA PRODUÇÃO** (após rotação do token operacional C1). Zero críticos, zero altos abertos.
