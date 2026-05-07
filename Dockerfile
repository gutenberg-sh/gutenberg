# syntax=docker/dockerfile:1

ARG PNPM_VERSION=10.33.1

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV CI=1
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/indexer/package.json ./apps/indexer/
COPY apps/gateway/package.json ./apps/gateway/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build-sources
COPY tsconfig.json tsconfig.base.json ./
COPY packages/core ./packages/core
COPY apps/indexer ./apps/indexer
COPY apps/gateway ./apps/gateway

FROM build-sources AS build-core-indexer
RUN pnpm --filter @gutenberg/core build && \
    pnpm --filter @gutenberg/indexer build

FROM build-core-indexer AS build-gateway
ARG VITE_GUTENBERG_SOLANA_RPC_URL
ARG VITE_GUTENBERG_IRYS_GATEWAY
ARG VITE_GUTENBERG_IRYS_NETWORK
ARG VITE_GUTENBERG_ARWEAVE_MIRRORS
ARG VITE_GUTENBERG_INDEXER_URL
ARG VITE_GUTENBERG_EXPLORER_URL
ENV VITE_GUTENBERG_SOLANA_RPC_URL=${VITE_GUTENBERG_SOLANA_RPC_URL}
ENV VITE_GUTENBERG_IRYS_GATEWAY=${VITE_GUTENBERG_IRYS_GATEWAY}
ENV VITE_GUTENBERG_IRYS_NETWORK=${VITE_GUTENBERG_IRYS_NETWORK}
ENV VITE_GUTENBERG_ARWEAVE_MIRRORS=${VITE_GUTENBERG_ARWEAVE_MIRRORS}
ENV VITE_GUTENBERG_INDEXER_URL=${VITE_GUTENBERG_INDEXER_URL}
ENV VITE_GUTENBERG_EXPLORER_URL=${VITE_GUTENBERG_EXPLORER_URL}
RUN pnpm --filter @gutenberg/gateway build

FROM build-core-indexer AS indexer-migrate
WORKDIR /app/apps/indexer
CMD ["pnpm", "exec", "drizzle-kit", "migrate"]

FROM build-core-indexer AS indexer-deploy
RUN pnpm --filter=@gutenberg/indexer deploy --prod --legacy /app/deploy

FROM node:22-bookworm-slim AS indexer
WORKDIR /app
COPY --from=indexer-deploy /app/deploy /app
ENV NODE_ENV=production
CMD ["node", "dist/src/main.js"]

FROM nginx:1.27-alpine AS gateway
COPY nginx.default.conf /etc/nginx/conf.d/default.conf
COPY --from=build-gateway /app/apps/gateway/dist /usr/share/nginx/html

FROM node:22-bookworm-slim AS gutenberg
ARG PNPM_VERSION=10.33.1
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-client \
    nginx \
    tini \
    util-linux \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY --from=indexer-migrate /app /app-migrate
COPY --from=indexer-deploy /app/deploy /app
COPY nginx.default.conf /etc/nginx/sites-available/default
RUN rm -f /etc/nginx/sites-enabled/default \
  && ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
COPY --from=build-gateway /app/apps/gateway/dist /usr/share/nginx/html

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app

ENV PGDATA=/var/lib/postgresql/data \
    POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=postgres \
    POSTGRES_DB=gutenberg \
    NODE_ENV=production \
    GUTENBERG_INDEXER_NODE_ENV=production \
    GUTENBERG_INDEXER_PORT=4000 \
    GUTENBERG_INDEXER_SOLANA_RPC_URL=https://api.mainnet.solana.com \
    GUTENBERG_INDEXER_SOLANA_WS_URL=wss://api.mainnet.solana.com \
    GUTENBERG_INDEXER_BACKFILL_BATCH_SIZE=1000 \
    GUTENBERG_INDEXER_BACKFILL_TX_CONCURRENCY=5 \
    GUTENBERG_INDEXER_CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080

EXPOSE 80 4000

ENTRYPOINT ["/usr/bin/tini", "-g", "--", "/entrypoint.sh"]
