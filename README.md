# Gutenberg

Gutenberg lets anyone publish freely, privately, and permanently on Solana.

## Prerequisites

Before you start, check if you have the following installed:

- **Node.js** `>=22.12.0`
- **pnpm** `>=10.28.2`
- **Solana CLI** for local validator and wallet utilities
- **Anchor CLI** for building and deploying the registry program

## Installing Dependencies

To install all workspace dependencies, run:

```bash
pnpm install
```

## Environment Setup

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

Fill in `.env`:

```txt
GUTENBERG_ARWEAVE_GATEWAY=https://gateway.irys.xyz
GUTENBERG_IRYS_NETWORK=devnet
GUTENBERG_SOLANA_RPC_URL=http://127.0.0.1:8899
GUTENBERG_SOLANA_PRIVATE_KEY=<base58-encoded-solana-secret-key>
```

- **`GUTENBERG_ARWEAVE_GATEWAY`** — Base URL embedded in manifests and on-chain URIs: `{gateway}/{transaction id}`. Prefer **`https://gateway.irys.xyz`** so links match how **[Irys](https://irys.xyz/)** resolves uploads. Plain **`https://arweave.net/{id}`** is a browser viewer URL for many ids and does not return raw JSON/tar; the CLI **rewrites** `arweave.net` to **`gateway.irys.xyz`** when fetching so older manifests still open.

- **`GUTENBERG_IRYS_NETWORK`** — `mainnet` or `devnet`; must match the Solana cluster you use with **`GUTENBERG_SOLANA_RPC_URL`**. This selects the Irys bundler endpoint used when uploading.

Publishing uploads blobs through **[Irys](https://irys.xyz/)** with **SOL** from the same wallet as **`GUTENBERG_SOLANA_PRIVATE_KEY`**. You need enough SOL on-chain for registry transactions **and** to fund the Irys balance used for storage (see `pnpm run cli:start doctor`). Legacy manifests that still use **`…/ipfs/{cid}`** URLs remain valid for verification.

`GUTENBERG_SOLANA_PRIVATE_KEY` is the publisher identity. Its public key is stored as the `publisher` value in manifests and on-chain release accounts, and the same wallet pays for release account creation and Irys uploads.

## Running Local Infrastructure

### Solana Registry

Run a local validator in a separate terminal:

```bash
pnpm run solana:validator
```

Build and deploy the Gutenberg registry program:

```bash
pnpm run solana:build
pnpm run solana:deploy
```

Gutenberg uses the same hardcoded registry program id across localnet, devnet, and mainnet.

Airdrop localnet SOL to the configured publisher wallet:

```bash
pnpm run solana:airdrop --amount 5
```

## Running the Project

### CLI

The CLI publishes Markdown folders, registers immutable releases, and opens verified releases.

Check local publisher configuration:

```bash
pnpm run cli:start doctor
```

Publish the demo Markdown folder (npm-style **`name@version`** first, then folder):

```bash
pnpm run cli:start publish gutenberg-demo@1.0.0 examples/gutenberg-demo
```

Open and verify the registered release:

```bash
pnpm run cli:start open gutenberg-demo@1.0.0
```

For a plain site name without a version, pass `--release-version` or omit it to pick the latest matching release:

```bash
pnpm run cli:start open gutenberg-demo --release-version 1.0.0
```

### Build And Lint

To build the CLI:

```bash
pnpm run cli:build
```

To lint the CLI:

```bash
pnpm run cli:lint
```

## How Publishing Works

Publishing a Markdown folder:

- Builds a deterministic POSIX tar of all site files and uploads it via **Irys** (paid in **SOL**), producing a permanent **`bundle_uri`** (`{gateway}/{tx id}`)
- Creates a signed manifest listing each file’s SHA-256 and that **`bundle_uri`**
- Uploads the signed manifest JSON the same way; **`manifest_uri`** on-chain is `{gateway}/{tx id}`
- Registers the release (`gutenberg.release.v1`) on Solana for `publisher + name + version`

The Solana registry stores the publisher, site name, version, manifest URI, manifest hash, and timestamp. Readers fetch the manifest and bundle over **HTTPS** (no storage API token required). They verify the bundle hash, per-file hashes, and the publisher signature.
