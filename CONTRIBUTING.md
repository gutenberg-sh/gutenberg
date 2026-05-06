This document is for **developers**: contributors, registry program work, and stack customization. For a first-time **mainnet** run with Docker, start with the [README](README.md#run-it-yourself).

## Pull requests

Contributions are welcome. For large changes, open an issue first so direction is agreed before heavy work.

1. Fork, branch from default, keep PRs **focused** (one logical change is easier to review and revert).
2. Install, then run the builds and linters for the packages you changed. Gateway defaults:

```bash
pnpm install
pnpm gateway:build
pnpm gateway:lint
```

Indexer example:

```bash
pnpm indexer:build
pnpm indexer:lint
```

Optional repo-wide formatting:

```bash
pnpm format
```

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

**Production stack** (Postgres, indexer, gateway; RPC/WS pointing to mainnet):

```bash
pnpm stack:up
```

When the app stack is up and healthy, services listen on the host using your **`.env`**:

- **Gateway** (UI): [http://localhost:8080](http://localhost:8080)
- **Indexer** (REST API): [http://localhost:4000](http://localhost:4000)

## Registry program

Deploy the program to the **local validator** that comes with the **development stack** above.

Send a little SOL to the wallet you deploy with (by default the file `~/.config/solana/id.json`; change the path after `-k` if yours lives somewhere else), then deploy:

```bash
solana airdrop 5 "$(solana address -k ~/.config/solana/id.json)" -u http://127.0.0.1:8899

pnpm solana:build
pnpm solana:deploy
```

Fund another address on the same validator:

```bash
solana airdrop 5 <PUBKEY> -u http://127.0.0.1:8899
```
