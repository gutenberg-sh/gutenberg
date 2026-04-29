# Veritas

Immutable Markdown publishing with S3-compatible content storage and a public registry.

## Local Storage

Local development uses MinIO through the same S3-compatible storage repository used for hosted S3 providers.

```bash
docker compose up -d minio minio-create-bucket
cp .env.example .env
```

The default env points at MinIO:

```txt
VERITAS_STORAGE_ENDPOINT=http://127.0.0.1:9000
VERITAS_STORAGE_BUCKET=veritas
VERITAS_STORAGE_ACCESS_KEY=minioadmin
VERITAS_STORAGE_SECRET_KEY=minioadmin
```

Run the CLI:

```bash
pnpm run cli:start doctor
pnpm run cli:start publish examples/veritas-demo --name veritas-demo --site-version 1.0.0
pnpm run cli:start open veritas-demo --site-version 1.0.0
```

`doctor` validates the publisher-local setup before publishing:

- S3-compatible bucket access
- Solana private key decoding
- Solana RPC connectivity
- Registry program id parsing
