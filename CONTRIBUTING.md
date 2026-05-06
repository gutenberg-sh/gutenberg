This is the **developer flow**: local validator, Solana program work, env tweaks, and how we ship changes. **For the normal, mainnet-backed install**, follow the [README](README.md#run-it-yourself) first; come back here when you need a dev stack or you are opening a PR.

## What you need

Docker, Node 22.22.2, pnpm 10.33.1 (see the README for Corepack). Solana and Anchor CLI when you build or deploy the registry program on the local validator.

## Install

```bash
pnpm install
```

## Environment (developer)

For day-to-day development you usually want the local validator and dev-style defaults:

| File | Role in the dev flow |
|------|------------------------|
| [`.env.local`](.env.local) | Local test validator, devnet-style Irys, local Postgres — **start here** |
| [`.env.production`](.env.production) | Same as the README’s mainnet run; use when you need to mirror production settings while hacking |

```bash
cp .env.local .env
```

Comments in each file explain the variables.

## Docker (developer)

From the repo root, with `.env` in place.

**Dev stack** (Postgres, gateway, indexer, bundled validator — what you use for program deploys and local RPC):

```bash
pnpm stack:up:local
```

**Mainnet-style stack** (no bundled validator; same shape as the README canonical run, useful to double-check behavior against mainnet):

```bash
cp .env.production .env   # if you are not already on production settings
pnpm stack:up
```

Gateway: **http://localhost:8080** — Indexer: **http://localhost:4000** — Quick check: **http://localhost:4000/health**.

**Clean slate** (drops local Postgres data):

```bash
pnpm stack:reset
```

Then start the stack again with the command you need.

## Registry program (local)

Use the dev stack: `.env` from `.env.local`, then `pnpm stack:up:local` so `http://127.0.0.1:8899` is up. Fund your deploy wallet and deploy:

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

Contributions are welcome. For big changes, please open an issue first.

Keep PRs small and focused. Before you open one, run the same steps as [CI](.github/workflows/ci.yml): install, build core, gateway, and indexer, then lint:

```bash
pnpm install
pnpm core:build
pnpm gateway:build
pnpm indexer:build
pnpm lint
```

If you touched `apps/solana`, also run `pnpm solana:test`. Optional: `pnpm format`. Describe what changed and why in the PR; link issues if any.

## If something breaks

- Nothing on localhost: Docker not running, or the stack still starting—wait a bit, then check `docker compose ps` from the repo root.
- Wrong network after editing `.env`: `pnpm stack:down`, then `pnpm stack:up` or `pnpm stack:up:local` again.
- Weird database state: use **Clean slate** above.
