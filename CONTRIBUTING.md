# Contributing

Contributions are welcome!

## How to contribute

1. Fork the repo → create a feature branch → commit (Conventional Commits) → open a PR.
2. Report bugs and request features via [Issues](https://github.com/helbertparanhos/clickup-mcp-pro/issues).
3. Questions: contato@helbertparanhos.com.br

## Development

```bash
npm install
npm run build        # tsc → dist/
npm run inspector    # MCP Inspector against the local build
```

### Adding a tool

Tools live in `src/tools/<domain>.ts` and are declared with the `defineTool`
helper. Each tool provides a Zod `schema`, a `description`, an optional
`write: true` flag (so `CLICKUP_READONLY` can block it), and a `handler` that
returns plain JS data. Register the tool's array in `src/tools/index.ts`.

Keep handlers thin: build the request body/params, call the shared `ClickUpClient`
(`client.get/post/put/patch/del`), and let `index.ts` handle serialization,
validation and the readonly gate.

## Code style

Match the surrounding code. Run `npm run build` before opening a PR — the project
must compile cleanly with `tsc` under `strict`.
