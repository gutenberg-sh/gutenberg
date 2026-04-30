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

That links the `gutenberg` CLI into `node_modules/.bin`.

Build the CLI (`pnpm cli:build`), then run commands with `pnpm exec gutenberg …`, or put `node_modules/.bin` on your `PATH` and run `gutenberg …` directly.

While you change CLI code, use the Nest CLI watch mode (same as in a typical Nest app):

```bash
pnpm cli:dev
```

That runs `nest start --watch` (via `apps/cli/scripts/nest-dev.cjs`, which invokes the Nest CLI with `node` so it resolves reliably under pnpm). It rebuilds with `tsc` and restarts when sources change.

To watch and repeatedly run a specific Gutenberg subcommand, pass it after `cli:dev`:

```bash
pnpm cli:dev open gutenberg-demo
pnpm cli:dev doctor
```

For a one-off run without watch, use the compiled CLI:

```bash
pnpm exec gutenberg open gutenberg-demo
```

To install the built CLI globally (optional):

```bash
pnpm cli:build
pnpm --filter @gutenberg/cli link --global
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

## Running Local Infrastructure

### Solana Registry

Run a local validator in a separate terminal:

```bash
pnpm solana:validator
```

Build and deploy the Gutenberg registry program:

```bash
pnpm solana:build
pnpm solana:deploy
```

Gutenberg uses the same hardcoded registry program id across localnet, devnet, and mainnet.

Airdrop localnet SOL to the publisher wallet in `.env` (defaults to 2 SOL if you omit the amount):

```bash
pnpm solana:airdrop -- 5
```

## Running the Project

### CLI

The CLI publishes folders of writing, registers immutable releases, and opens verified releases.

Check local publisher configuration:

```bash
pnpm cli:dev doctor
```

Publish the demo folder:

```bash
pnpm cli:dev publish gutenberg-demo@1.0.0 examples/gutenberg-demo
```

Open and verify the registered release (pin a version with `@` or omit it to use the latest release for that name):

```bash
pnpm cli:dev open gutenberg-demo@1.0.0
pnpm cli:dev open gutenberg-demo
```

### Build And Lint

To build the CLI:

```bash
pnpm cli:build
```

To lint the CLI:

```bash
pnpm cli:lint
```