# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl
RUN npm install -g pnpm@12.21.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/scheduler/ ./apps/scheduler/

RUN pnpm install --frozen-lockfile
RUN pnpm approve-builds --all

RUN pnpm --filter @pulsewatch/database db:generate
RUN pnpm --filter @pulsewatch/scheduler build

# ==========================================
# STAGE 2: Production Runner
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache dumb-init curl openssl
USER node

COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/apps/scheduler ./apps/scheduler

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/scheduler/dist/index.js"]
