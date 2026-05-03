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

Copy the example file and set values for the gateway (Vite), indexer, and your network:

```bash
cp .env.example .env
```

The gateway reads **`VITE_*`** variables from `.env` at dev and build time. For local publishing against the validator, align `VITE_GUTENBERG_SOLANA_RPC_URL` with `GUTENBERG_INDEXER_SOLANA_RPC_URL` (see comments in `.env.example`).

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

To fund your publisher, you can airdrop some SOL via:

```bash
solana airdrop 100 <RECIPIENT> -u http://127.0.0.1:8899
```

Build and deploy the Gutenberg registry program:

```bash
pnpm solana:build
pnpm solana:deploy
```

## Gateway

The gateway is the reader-facing web app and the **publisher UI**. It looks up releases on the registry, fetches manifests and files from durable storage, verifies signatures and content hashes in the browser, and exposes **`/publish`** to upload a bundle (folder, files, or zip), sign with your wallet, and register the release.

```bash
pnpm gateway:dev
pnpm gateway:build
pnpm gateway:preview
```

Use `examples/gutenberg-demo` as a sample tree: it includes **`/index.md`** at the root, which the publish flow requires.

## Indexer

The indexer is a service that turns the on-chain registry into a fast, searchable read API. Every record it returns can still be re-verified against the chain by the gateway, so the indexer is a convenience, not an authority.

```bash
pnpm indexer:db:apply
pnpm indexer:dev
```

## Contributing

Contributions are welcome. For larger changes, please open an issue first so the direction is agreed before you invest heavy time.

**Workflow**

1. Fork the repository and create a branch from the default branch.
2. Keep pull requests focused: one logical change per PR is easier to review and revert.
3. After `pnpm install`, run `pnpm gateway:build` and `pnpm gateway:lint` before submitting. Use `pnpm gateway:format` when you want ESLint/Prettier fixes applied in the gateway app.
4. Describe what changed and why in the PR body; link related issues when applicable.

If you are unsure whether something belongs in the gateway, the Solana program, or both, ask in an issue and we can narrow the scope.

## License

[MIT](LICENSE)
