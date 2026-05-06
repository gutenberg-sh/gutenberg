This document is for **developers**: contributors, registry program work, and stack customization. For a first-time **mainnet** run with Docker, start with the [README](README.md#run-it-yourself).

## Prerequisites

- **Docker** — Compose stack: Postgres, indexer, gateway (mainnet-style defaults unless you switch env).
- **Node.js** `>=22.12.0` and **pnpm** `>=10.28.2` (`<11`) — installs, lint, and builds before a PR.
- **Solana CLI** and **Anchor CLI** — only when you build or deploy the registry program against a **local** validator.

## Install dependencies

```bash
pnpm install
```

## Environment

Tracked files (pick one, copy to **`.env`** at the repo root):

| File | Use case |
|------|----------|
| [`.env.production`](.env.production) | Public mainnet RPC / WS, mainnet Irys, local Postgres for the indexer. |
| [`.env.local`](.env.local) | Bundled test validator (`127.0.0.1:8899`), devnet Irys, local Postgres. Use with Compose **`--profile local-chain`**. |

```bash
cp .env.production .env   # or: cp .env.local .env
```

Compose fills unset variables from **`${VAR:-default}`** in `docker-compose.yml`. **`VITE_*`** values are baked into the **gateway image** at build time (`build.args`). **`VITE_GUTENBERG_INDEXER_URL`** must be a URL the **browser** can reach (usually **`http://127.0.0.1:4000`**).

For **`pnpm --filter @gutenberg/gateway dev`**, Vite loads env from **`apps/`** (`envDir` in `vite.config.ts`). **`apps/.env`** is a symlink to **`../.env`**, so the same repo-root **`.env`** drives Vite and Compose without Vite auto-merging the tracked **`.env.local`** file.

## Run with Docker

From the repository root.

**Mainnet stack** (local Postgres, indexer on public mainnet RPC, gateway — no local validator):

```bash
docker compose --profile app up -d --build --wait
```

**Local test validator** (Anchor iteration): add **`local-chain`** and use **`.env.local`** (or equivalent **`127.0.0.1:8899` / `ws://127.0.0.1:8900`** in **`.env`**):

```bash
docker compose --profile app --profile local-chain up -d --build --wait
```

Useful commands:

```bash
docker compose down              # stop services
docker compose down -v           # stop and remove volumes (DB + validator data)
docker compose up -d --wait      # Postgres only (no app profile)
```

Gateway **http://localhost:8080**, indexer **http://localhost:4000** (unless you changed ports in **`.env`**). **`indexer-migrate`** runs Drizzle **`migrate`** after Postgres is healthy.

After changing gateway or indexer **source** or any **`VITE_*`** value, rebuild: `docker compose --profile app up -d --build --wait` (or `docker compose --profile app build`).

## Registry program (Anchor)

With **`local-chain`** and RPC/WS in **`.env`** pointing at **`127.0.0.1:8899`** / **`ws://127.0.0.1:8900`**:

```bash
pnpm --filter @gutenberg/solana run anchor:build
pnpm --filter @gutenberg/solana run anchor:deploy
```

If you deploy under a **new** program id, update **`GUTENBERG_REGISTRY_PROGRAM_ID`** in [`packages/core/src/instruction.ts`](packages/core/src/instruction.ts), then rebuild gateway images.

Fund a wallet on the local validator:

```bash
solana airdrop 100 <RECIPIENT> -u http://127.0.0.1:8899
```

## Services

- **Gateway** — Reader and publisher UI: registry lookups, durable storage fetch, signature and hash checks, **`/publish`**. Sample bundle: `examples/gutenberg-demo` (include **`/index.md`** at the tree root).
- **Indexer** — HTTP API over the on-chain registry; the gateway can still verify against the chain directly.

## Pull requests

Contributions are welcome. For large changes, open an issue first so direction is agreed before heavy work.

1. Fork, branch from default, keep PRs **focused** (one logical change is easier to review and revert).
2. After **`pnpm install`**, run **`pnpm --filter @gutenberg/gateway run build`** and **`pnpm --filter @gutenberg/gateway run lint`** (and the same for other packages you touched). Use **`pnpm --filter … run format`** when you want auto-fixes.
3. In the PR body, describe **what** changed and **why**; link issues when relevant.

If you are unsure whether work belongs in the gateway, the Solana program, or both, ask in an issue.
