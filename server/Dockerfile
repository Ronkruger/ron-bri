FROM node:20-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json turbo.json ./

# Copy the shared packages, web app, and API source.
COPY packages ./packages
COPY apps/web ./apps/web
COPY server ./server

# Install the workspaces needed to build the deployable web/API service.
RUN npm ci --workspace=web --workspace=server --workspace=packages/api-client --workspace=packages/types --workspace=packages/ui-tokens --workspace=packages/tsconfig --include-workspace-root

# Build both parts. Express serves the web output in the final image.
RUN npm run build --workspace=web && npm run build --workspace=server

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/tsconfig ./packages/tsconfig
COPY packages/types ./packages/types
COPY server ./server

RUN npm ci --omit=dev --workspace=server --workspace=packages/types --workspace=packages/tsconfig --include-workspace-root

# Copy compiled output and prisma generated client from builder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
