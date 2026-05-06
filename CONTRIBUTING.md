This document is for **developers**: contributors, registry program work, and stack customization. For a first-time **mainnet** run with Docker, start with the [README](README.md#run-it-yourself).

## Pull requests

Contributions are welcome. For large changes, open an issue first so direction is agreed before heavy work.

1. Fork, branch from default, keep PRs **focused** (one logical change is easier to review and revert).
2. After **`pnpm install`**, run **`pnpm gateway:build`** and **`pnpm gateway:lint`** (and the matching scripts for other packages you touched, for example **`pnpm indexer:build`** / **`pnpm indexer:lint`**). Use **`pnpm format`** when you want auto-fixes across packages.
3. In the PR body, describe **what** changed and **why**; link issues when relevant.

If you are unsure whether work belongs in the gateway, indexer, the Solana program, ask in an issue.

## Prerequisites

- **Docker**: Postgres, indexer, gateway (mainnet-style defaults unless you switch env).
- **Node.js** `>=22.12.0` and **pnpm** `>=10.28.2` (`<11`): installs, lint, and builds before a PR.
- **Solana CLI** and **Anchor CLI**: only when you build or deploy the registry program against a **local** validator.

## Install dependencies

```bash
pnpm install
```

## Environment

Tracked files (pick one, copy to **`.env`** at the repo root):

| File | Use case |
|------|----------|
| [`.env.local`](.env.local) | Bundled test validator (`127.0.0.1:8899`), devnet Irys, local Postgres. |
| [`.env.production`](.env.production) | Public mainnet RPC / WS, mainnet Irys, local Postgres for the indexer. |

```bash
cp .env.local .env
# cp .env.production .env   
```

## Run with Docker

From the repository root.

**Development stack** (Postgres, indexer, gateway, and the bundled test validator):

```bash
pnpm stack:up:local
```

**Mainnet-style stack** (Postgres, indexer, gateway; RPC/WS from **`.env`**, typically public mainnet):

```bash
pnpm stack:up
```

When the app stack is up and healthy, services listen on the host using your **`.env`** (defaults in parentheses):

- **Gateway** (UI): [http://localhost:8080](http://localhost:8080) (`GUTENBERG_GATEWAY_PORT`)
- **Indexer** (HTTP API): [http://localhost:4000](http://localhost:4000) (`GUTENBERG_INDEXER_PORT`; health check: `/health`)

With **`pnpm stack:up:local`**, the test validator is additionally at **HTTP** `127.0.0.1:8899` and **WebSocket** `ws://127.0.0.1:8900` (`GUTENBERG_SOLANA_RPC_PORT` / `GUTENBERG_SOLANA_WS_PORT`).

Other **stack** scripts (Docker Compose):

```bash
pnpm stack:prepare   # Postgres (Compose default services), wait for health, then `pnpm indexer:db:apply`
pnpm stack:down      # stop and remove containers for this Compose project
pnpm stack:reset     # `stack:down` and remove volumes (Postgres + validator data)
```

## Registry program

With **`local-chain`** and RPC/WS in **`.env`** pointing at **`127.0.0.1:8899`** / **`ws://127.0.0.1:8900`**:

```bash
pnpm solana:build
pnpm solana:deploy
```

If you deploy under a **new** program id, update **`GUTENBERG_REGISTRY_PROGRAM_ID`** in [`packages/core/src/instruction.ts`](packages/core/src/instruction.ts), then rebuild gateway images.

Fund a wallet on the local validator:

```bash
solana airdrop 100 <RECIPIENT> -u http://127.0.0.1:8899
```

## Services

- **Gateway**: Reader and publisher UI: registry lookups, durable storage fetch, signature and hash checks, **`/publish`**.
- **Indexer**: HTTP API over the on-chain registry; the gateway can still verify against the chain directly.
