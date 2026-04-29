# Gutenberg

Gutenberg lets anyone publish freely, privately, and permanently on Solana.

## Prerequisites

Before you start, check if you have the following installed:

- **Node.js** `>=22.12.0`
- **pnpm** `>=10.28.2`
- **Docker** for local MinIO storage
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
GUTENBERG_STORAGE_ENDPOINT=http://127.0.0.1:9000
GUTENBERG_STORAGE_BUCKET=gutenberg
GUTENBERG_STORAGE_ACCESS_KEY=minioadmin
GUTENBERG_STORAGE_SECRET_KEY=minioadmin
GUTENBERG_SOLANA_RPC_URL=http://127.0.0.1:8899
GUTENBERG_SOLANA_PRIVATE_KEY=<base58-encoded-solana-secret-key>
```

`GUTENBERG_SOLANA_PRIVATE_KEY` is the publisher identity. Its public key is stored as the `publisher` value in manifests and on-chain release accounts, and the same wallet pays for release account creation.

## Running Local Infrastructure

### MinIO

Local development uses MinIO through the same S3-compatible storage repository used for hosted S3 providers.

```bash
pnpm run docker:up
```

This starts MinIO and creates the configured bucket.

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

Publish the demo Markdown folder:

```bash
pnpm run cli:start publish examples/gutenberg-demo --name gutenberg-demo --site-version 1.0.0
```

Open and verify the registered release:

```bash
pnpm run cli:start open gutenberg-demo --site-version 1.0.0
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

- Stores files in S3-compatible storage using content-addressed keys
- Creates a signed manifest with hashes for every file
- Stores the manifest off-chain
- Registers the release on Solana for `publisher + name + version`

The Solana registry stores the publisher, site name, version, manifest URI, manifest hash, and timestamp. Readers can fetch the manifest and files, then verify that the content matches what the publisher signed.
