# syntax=docker/dockerfile:1

ARG PNPM_VERSION=10.33.1

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV CI=1
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/indexer/package.json ./apps/indexer/
COPY apps/gateway/package.json ./apps/gateway/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build-sources
COPY tsconfig.json tsconfig.base.json ./
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/indexer ./apps/indexer
COPY apps/gateway ./apps/gateway

FROM build-sources AS build-backend
RUN pnpm --filter @gutenberg/core build && \
    pnpm --filter @gutenberg/db build && \
    pnpm --filter @gutenberg/shared build && \
    pnpm --filter @gutenberg/api build && \
    pnpm --filter @gutenberg/indexer build

FROM build-sources AS build-gateway
ARG VITE_GUTENBERG_SOLANA_RPC_URL
ARG VITE_GUTENBERG_IRYS_GATEWAY
ARG VITE_GUTENBERG_IRYS_NETWORK
ARG VITE_GUTENBERG_ARWEAVE_MIRRORS
ARG VITE_GUTENBERG_API_URL
ARG VITE_GUTENBERG_EXPLORER_URL
ENV VITE_GUTENBERG_SOLANA_RPC_URL=${VITE_GUTENBERG_SOLANA_RPC_URL}
ENV VITE_GUTENBERG_IRYS_GATEWAY=${VITE_GUTENBERG_IRYS_GATEWAY}
ENV VITE_GUTENBERG_IRYS_NETWORK=${VITE_GUTENBERG_IRYS_NETWORK}
ENV VITE_GUTENBERG_ARWEAVE_MIRRORS=${VITE_GUTENBERG_ARWEAVE_MIRRORS}
ENV VITE_GUTENBERG_API_URL=${VITE_GUTENBERG_API_URL}
ENV VITE_GUTENBERG_EXPLORER_URL=${VITE_GUTENBERG_EXPLORER_URL}
RUN pnpm --filter @gutenberg/core build && pnpm --filter @gutenberg/gateway build

FROM build-backend AS db-migrate
WORKDIR /app/packages/db
CMD ["pnpm", "exec", "drizzle-kit", "migrate"]

FROM build-backend AS api-deploy
RUN pnpm --filter=@gutenberg/api deploy --prod --legacy /app/deploy-api

FROM build-backend AS indexer-deploy
RUN pnpm --filter=@gutenberg/indexer deploy --prod --legacy /app/deploy-indexer

FROM node:22-bookworm-slim AS api
WORKDIR /app
COPY --from=api-deploy /app/deploy-api /app
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/src/main.js"]

FROM node:22-bookworm-slim AS indexer
WORKDIR /app
COPY --from=indexer-deploy /app/deploy-indexer /app
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

COPY --from=db-migrate /app /app-migrate
COPY --from=api-deploy /app/deploy-api /app-api
COPY --from=indexer-deploy /app/deploy-indexer /app-indexer
COPY nginx.default.conf /etc/nginx/sites-available/default
RUN rm -f /etc/nginx/sites-enabled/default \
  && ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
COPY --from=build-gateway /app/apps/gateway/dist /usr/share/nginx/html

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app-api

ENV PGDATA=/var/lib/postgresql/data \
    POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=postgres \
    POSTGRES_DB=gutenberg \
    NODE_ENV=production \
    GUTENBERG_API_NODE_ENV=production \
    GUTENBERG_API_PORT=4000 \
    GUTENBERG_API_CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080 \
    GUTENBERG_INDEXER_NODE_ENV=production \
    GUTENBERG_INDEXER_SOLANA_RPC_URL=https://api.mainnet.solana.com \
    GUTENBERG_INDEXER_SOLANA_WS_URL=wss://api.mainnet.solana.com \
    GUTENBERG_INDEXER_BACKFILL_BATCH_SIZE=1000 \
    GUTENBERG_INDEXER_BACKFILL_TX_CONCURRENCY=5

EXPOSE 80 4000

ENTRYPOINT ["/usr/bin/tini", "-g", "--", "/entrypoint.sh"]
