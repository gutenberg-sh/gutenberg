# Contributing

Contributions are welcome. For substantial changes, open an issue first so we can agree on direction before you invest a lot of time.

## Prerequisites

- **Docker**
- **Node.js** 22.22.2 and **pnpm** 10.33.1
- **Solana CLI** and **Anchor**

## Clone and install

```bash
git clone https://github.com/leonmeka/gutenberg.git
cd gutenberg
pnpm install
```

Copy [`.env.local`](.env.local) to `.env` in the repo root.

## Local development

**Postgres and the Solana test validator run in Docker.** The gateway, indexer, and everything else run via pnpm on your machine (hot reload, normal debugging).

### 1. Start infrastructure

With `.env` in place:

```bash
pnpm stack:up
```

That starts Postgres (port **5432**) and the test validator (RPC **8899**, WebSocket **8900**) and waits until both are healthy.

Stop containers: `pnpm stack:down`. To wipe the local Postgres volume and start clean: `pnpm stack:reset`, then `pnpm stack:up` again.

### 2. Database migrations

After the first `pnpm stack:up`, or whenever you pull migration changes:

```bash
pnpm indexer:db:apply
```

### 3. Run apps

Use separate terminals (order does not matter after Postgres is up):

```bash
pnpm indexer:dev
pnpm gateway:dev
```

- Gateway: **http://localhost:5173**
- Indexer: **http://localhost:4000**

## Solana program (`apps/solana`)

With `pnpm stack:up` running and RPC at `http://127.0.0.1:8899`:

```bash
solana airdrop 5 "$(solana address -k ~/.config/solana/id.json)" -u http://127.0.0.1:8899

pnpm solana:build
pnpm solana:deploy
```

## Pull requests

Keep changes small and focused. Before you open a PR, run the same checks as [CI](.github/workflows/ci.yml):

```bash
pnpm install
pnpm core:build
pnpm gateway:build
pnpm indexer:build
pnpm lint
```

If you changed `apps/solana`, also run `pnpm solana:test`. Formatting is optional: `pnpm format`.

In the PR description, explain what changed and why; link related issues when they exist.
