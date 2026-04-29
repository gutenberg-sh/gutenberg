# Gutenberg

Gutenberg is the publishing layer for verifiable content on Solana.

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

Required values:

```txt
GUTENBERG_STORAGE_ENDPOINT=http://127.0.0.1:9000
GUTENBERG_STORAGE_BUCKET=gutenberg
GUTENBERG_STORAGE_ACCESS_KEY=minioadmin
GUTENBERG_STORAGE_SECRET_KEY=minioadmin
GUTENBERG_SOLANA_RPC_URL=http://127.0.0.1:8899
GUTENBERG_SOLANA_PRIVATE_KEY=<base58-encoded-solana-secret-key>
GUTENBERG_REGISTRY_PROGRAM_ID=<deployed-gutenberg-registry-program-id>
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

Gutenberg uses the same registry program id across localnet, devnet, and mainnet. After deployment, set `GUTENBERG_REGISTRY_PROGRAM_ID` in `.env` to the program id from `apps/solana/Anchor.toml`.

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

Publishing a Markdown folder does the following:

- Uploads Markdown files to S3-compatible storage using content-addressed keys
- Creates a signed manifest that points at those immutable file objects
- Uploads the manifest to S3-compatible storage
- Writes a release account to the Solana registry for `publisher + name + version`

On-chain release accounts store the publisher public key, site name, version, manifest URI, manifest hash, and creation timestamp. The publisher is always the transaction signer and payer. The manifest hash pins the exact signed manifest bytes registered on-chain. The manifest is signed by that publisher and contains hashes for every Markdown file, so readers can verify that the registered manifest and fetched content were not tampered with. The Markdown files and manifest content stay in S3-compatible storage.

## Doctor Checks

`doctor` validates the publisher-local setup before publishing:

- S3-compatible bucket access
- Solana private key decoding
- Solana RPC connectivity
- Registry program id parsing
