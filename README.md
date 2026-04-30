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

## Why we build this

Whether you like it or not, governments and major outlets enforce a certain narrative. Work that contradicts it gets taken down, sued, or buried.

Gutenberg lets you publish freely, privately, and permanently: content is written to durable storage and registered on a public chain, signed by the author. Once published, no host, editor, or court can censor the original.

## Prerequisites

- **Node.js** `>=22.12.0`
- **pnpm** `>=10.28.2` (and `<11`, per `package.json` engines)
- **Solana CLI** — local validator and wallet utilities
- **Anchor CLI** — build and deploy the registry program

## Installing dependencies

To install all workspace dependencies, run:

```bash
pnpm install
```

## Environment

Copy the example file and set values for your gateway, network, RPC, and publisher key:

```bash
cp .env.example .env
```

```txt
# CLI
GUTENBERG_ARWEAVE_GATEWAY=https://gateway.irys.xyz
GUTENBERG_IRYS_NETWORK=devnet
GUTENBERG_SOLANA_RPC_URL=http://127.0.0.1:8899
GUTENBERG_SOLANA_PRIVATE_KEY=<base58-encoded-solana-secret-key>
GUTENBERG_GATEWAY_URL=http://localhost:5173

# Gateway
VITE_GUTENBERG_REGISTRY_PROGRAM_ID=NRrK71RxAHpt5CdLUWgRzTuzMopnRBnEqCiCku6J517
VITE_GUTENBERG_SOLANA_RPC_URL=http://127.0.0.1:8899
VITE_GUTENBERG_ARWEAVE_GATEWAY=https://gateway.irys.xyz
```

## Local Solana registry

In a separate terminal, run a local validator:

```bash
pnpm solana:validator
```

Build and deploy the Gutenberg registry program:

```bash
pnpm solana:build
pnpm solana:deploy
```

Gutenberg uses the same hardcoded registry program id across localnet, devnet, and mainnet.

## CLI

Check configuration:

```bash
pnpm cli:dev -- doctor
```

Publish the demo folder:

```bash
pnpm cli:dev -- publish gutenberg-demo@1.0.0 examples/gutenberg-demo
```

Open a release in the gateway:

```bash
pnpm cli:dev -- open gutenberg-demo@1.0.0
pnpm cli:dev -- open gutenberg-demo
```

Remove a registry release:

```bash
pnpm cli:dev -- unpublish gutenberg-demo@1.0.0
pnpm cli:dev -- unpublish gutenberg-demo
```

## Gateway

The gateway performs all verification in the browser using WebCrypto (SHA-256),
`@noble/curves` (Ed25519), a minimal POSIX tar reader, and direct Solana
JSON-RPC calls — no Solana SDK or Node dependencies in the bundle.

```bash
pnpm gateway:dev
pnpm gateway:build
pnpm gateway:start
```

## Build and lint

```bash
pnpm cli:build
pnpm cli:lint
pnpm gateway:build
pnpm gateway:lint
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
