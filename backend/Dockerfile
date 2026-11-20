# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build essentials for native dependencies (argon2, etc.) and openssl for Prisma engines
RUN apk add --no-cache python3 make g++ openssl

# Install pnpm
RUN npm install -g pnpm@12.21.0

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./

# Copy packages and application source
COPY packages/ ./packages/
COPY backend/ ./backend/

# Install dependencies and approve builds
RUN pnpm install --frozen-lockfile
RUN pnpm approve-builds --all

# Generate Prisma client and build Express Backend
RUN pnpm --filter @pulsewatch/database db:generate
RUN pnpm --filter @pulsewatch/backend build

# ==========================================
# STAGE 2: Production Runner
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4001

# Install dumb-init, curl, and openssl for Prisma engines on Alpine
RUN apk add --no-cache dumb-init curl openssl

# Create non-root user
USER node

# Copy build artifacts and dependencies from builder
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/backend ./backend

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4001/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "backend/dist/server.js"]
