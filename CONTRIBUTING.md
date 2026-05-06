# Contributing

Contributions are welcome. For substantial changes, open an issue first so we can agree on direction before you invest a lot of time.

## Prerequisites

- **Docker** (for the local stack in `docker-compose.yml`)
- **Node.js** 22.22.2 and **pnpm** 10.33.1 (see the [README](README.md) for Corepack)
- **Solana CLI** and **Anchor** when you work on `apps/solana`

## Clone and install

```bash
git clone https://github.com/leonmeka/gutenberg.git
cd gutenberg
pnpm install
```

Copy [`.env.local`](.env.local) to `.env` in the repo root (defaults for the bundled test validator and local Postgres). The comments in `.env.local` describe each variable.

## Local Development

From the repo root, with `.env` in place:

```bash
pnpm stack:up
```

That builds and runs the all-in-one Gutenberg image (Postgres, indexer, gateway inside one container) and the Solana test validator.

- Gateway: **http://localhost:8080**
- Indexer API: **http://localhost:4000**
- Health check: **http://localhost:4000/health**

Database migrations run automatically when the container starts.

Stop everything: `pnpm stack:down`. Wipe Postgres data and start clean: `pnpm stack:reset`, then `pnpm stack:up` again.

## Solana program (`apps/solana`)

With the stack up and RPC at `http://127.0.0.1:8899`:

```bash
solana airdrop 5 "$(solana address -k ~/.config/solana/id.json)" -u http://127.0.0.1:8899

pnpm solana:build
pnpm solana:deploy
```

Fund another address:

```bash
solana airdrop 5 <PUBKEY> -u http://127.0.0.1:8899
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
