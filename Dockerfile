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
RUN pnpm install --frozen-lockfile

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
COPY docker/gateway/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build-gateway /app/apps/gateway/dist /usr/share/nginx/html
