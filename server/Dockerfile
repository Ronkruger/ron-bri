FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json turbo.json ./

# Copy workspace packages the server depends on
COPY packages/tsconfig ./packages/tsconfig
COPY packages/types ./packages/types

# Copy server source
COPY server ./server

# Install all workspace deps from root
RUN npm ci --workspace=server --workspace=packages/types --workspace=packages/tsconfig --include-workspace-root

# Build server (prisma generate + tsc)
RUN npm run build --workspace=server

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/tsconfig ./packages/tsconfig
COPY packages/types ./packages/types
COPY server ./server

RUN npm ci --omit=dev --workspace=server --workspace=packages/types --workspace=packages/tsconfig --include-workspace-root

# Copy compiled output and prisma generated client from builder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
