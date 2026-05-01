<p align="center">
  <img src="assets/banner.png" alt="Gutenberg — publish freely, privately, and permanently on Solana" width="720" />
</p>

<h1 align="center">Gutenberg</h1>

<p align="center">
  <strong>Gutenberg lets anyone publish freely, privately, and permanently on Solana.</strong>
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D22.12.0-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-%3E%3D10.28.2-f69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Solana-registry-9945FF?style=flat-square&logo=solana&logoColor=white" alt="Solana" />
  <img src="https://img.shields.io/badge/Anchor-registry%20program-3E4348?style=flat-square" alt="Anchor registry program" />
</p>

---

## Why Gutenberg?

Whether you like it or not, governments and major outlets enforce a certain narrative. Work that contradicts it gets taken down, sued, or buried.

Gutenberg lets you publish freely, privately, and permanently: content is written to durable storage and registered on a public chain, signed by the author. Once published, no host, editor, or court can censor the original.

## Prerequisites

- **Node.js** `>=22.12.0`
- **pnpm** `>=10.28.2` (and `<11`, per `package.json` engines)
- **Docker** — runs the local Solana validator and indexer Postgres
- **Solana CLI** — wallet utilities and program interaction
- **Anchor CLI** — build and deploy the registry program

## Installing dependencies

To install all workspace dependencies, run:

```bash
pnpm install
```

## Environment

Copy the example file and set values for your gateway, network, and RPC:

```bash
cp .env.example .env
```

## Local infrastructure

A single command brings up everything Gutenberg expects locally:

```bash
pnpm env:setup
```

To stop the containers (state is preserved across restarts):

```bash
pnpm env:teardown
```

To wipe all local state (validator ledger and Postgres data):

```bash
pnpm env:reset
```

```txt
# CLI
GUTENBERG_CLI_IRYS_NETWORK=
GUTENBERG_CLI_SOLANA_RPC_URL=
GUTENBERG_CLI_GATEWAY_URL=

# Gateway
VITE_GUTENBERG_REGISTRY_PROGRAM_ID=
VITE_GUTENBERG_SOLANA_RPC_URL=
VITE_GUTENBERG_IRYS_GATEWAY=
VITE_GUTENBERG_ARWEAVE_MIRRORS=
VITE_GUTENBERG_EXPLORER_URL=
VITE_GUTENBERG_INDEXER_URL=

# Indexer
GUTENBERG_INDEXER_NODE_ENV=
GUTENBERG_INDEXER_PORT=
GUTENBERG_INDEXER_DATABASE_URL=
GUTENBERG_INDEXER_SOLANA_RPC_URL=
GUTENBERG_INDEXER_SOLANA_WS_URL=
GUTENBERG_INDEXER_PROGRAM_ID=
GUTENBERG_INDEXER_BACKFILL_BATCH_SIZE=
GUTENBERG_INDEXER_BACKFILL_TX_CONCURRENCY=
GUTENBERG_INDEXER_RECONCILE_LOOKBACK_SLOTS=
```


To fund your publisher, you can airdrop some SOL via:

```bash
solana airdrop 100 <RECIPIENT> -u http://127.0.0.1:8899
```

Build and deploy the Gutenberg registry program:

```bash
pnpm solana:build
pnpm solana:deploy
```

## CLI

The CLI is the publisher's tool. It uploads your content to durable storage (Irys/Arweave), builds and signs a manifest with your wallet, and submits the release to the registry program.

Check configuration:

```bash
pnpm cli:start doctor
```

Publish the demo folder:

```bash
pnpm cli:start publish gutenberg-demo@1.0.0 examples/gutenberg-demo
```

Open a release in the gateway:

```bash
pnpm cli:start open gutenberg-demo@1.0.0
pnpm cli:start open gutenberg-demo
```

## Indexer

The indexer is a service that turns the on-chain registry into a fast, searchable read API. Every record it returns can still be re-verified against the chain by the gateway, so the indexer is a convenience, not an authority.

```bash
pnpm indexer:db:apply
pnpm indexer:dev
```

## Gateway

The gateway is the reader-facing web app. It looks up a release on the registry, fetches the manifest and files from durable storage, verifies signatures and content hashes locally in your browser, and renders the result. It also exposes a `/publish` flow that lets you publish from the browser using your wallet.

```bash
pnpm gateway:dev
pnpm gateway:build
pnpm gateway:start
```

## Contributing

Contributions are welcome. For larger changes, please open an issue first so the direction is agreed before you invest heavy time.

**Workflow**

1. Fork the repository and create a branch from the default branch.
2. Keep pull requests focused: one logical change per PR is easier to review and revert.
3. After `pnpm install`, run `pnpm cli:build` and `pnpm cli:lint` before submitting. Use `pnpm cli:format` if you touched CLI formatting or want ESLint/Prettier fixes applied consistently.
4. Describe what changed and why in the PR body; link related issues when applicable.

If you are unsure whether something belongs in the CLI, the Solana program, or both, ask in an issue and we can narrow the scope.

## License

[MIT](LICENSE)
