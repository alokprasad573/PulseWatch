# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY services/scheduler/ ./services/scheduler/

RUN npm ci

RUN npm run db:generate --workspace=@pulsewatch/database
RUN npx turbo run build --filter=@pulsewatch/scheduler...

# ==========================================
# STAGE 2: Production Runner
# ==========================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache dumb-init curl openssl
USER node

COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/services/scheduler ./services/scheduler

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "services/scheduler/dist/index.js"]
