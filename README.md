# Veritas

Veritas is an immutable Markdown publishing system with S3-compatible content storage and a public Solana registry.

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
VERITAS_STORAGE_ENDPOINT=http://127.0.0.1:9000
VERITAS_STORAGE_BUCKET=veritas
VERITAS_STORAGE_ACCESS_KEY=minioadmin
VERITAS_STORAGE_SECRET_KEY=minioadmin
VERITAS_SOLANA_RPC_URL=http://127.0.0.1:8899
VERITAS_SOLANA_PRIVATE_KEY=<base58-encoded-solana-secret-key>
VERITAS_REGISTRY_PROGRAM_ID=<deployed-veritas-registry-program-id>
```

`VERITAS_SOLANA_PRIVATE_KEY` is the publisher identity. Its public key is stored as the `publisher` value in manifests and on-chain release accounts.

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
solana-test-validator
```

Build and deploy the Veritas registry program:

```bash
pnpm run solana:build
pnpm run solana:deploy
```

After deployment, set `VERITAS_REGISTRY_PROGRAM_ID` in `.env` to the deployed program id.

## Running the Project

### CLI

The CLI publishes Markdown folders, registers immutable releases, and opens verified releases.

Check local publisher configuration:

```bash
pnpm run cli:start doctor
```

Publish the demo Markdown folder:

```bash
pnpm run cli:start publish examples/veritas-demo --name veritas-demo --site-version 1.0.0
```

Open and verify the registered release:

```bash
pnpm run cli:start open veritas-demo --site-version 1.0.0
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

On-chain release accounts store the publisher public key, site name, version, manifest URI, release signature, and creation timestamp. The Markdown files and manifest content stay in S3-compatible storage.

## Doctor Checks

`doctor` validates the publisher-local setup before publishing:

- S3-compatible bucket access
- Solana private key decoding
- Solana RPC connectivity
- Registry program id parsing
