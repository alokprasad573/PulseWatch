# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

# Install build essentials for native dependencies (argon2, etc.) and openssl for Prisma engines
RUN apk add --no-cache python3 make g++ openssl

# Copy workspace configuration
COPY package.json package-lock.json turbo.json tsconfig.base.json ./

# Copy packages, services, and application source
COPY packages/ ./packages/
COPY services/ ./services/
COPY backend/ ./backend/

# Install dependencies
RUN npm ci

# Generate Prisma client and build dependencies & Express Backend
RUN npm run db:generate --workspace=@pulsewatch/database
RUN npx turbo run build --filter=@pulsewatch/backend...

# ==========================================
# STAGE 2: Production Runner
# ==========================================
FROM node:24-alpine AS runner

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
COPY --chown=node:node --from=builder /app/services ./services
COPY --chown=node:node --from=builder /app/backend ./backend

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4001/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "backend/dist/server.js"]
