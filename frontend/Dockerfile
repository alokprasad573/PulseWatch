# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json turbo.json tsconfig.base.json ./

# Copy packages and application source
COPY packages/ ./packages/
COPY frontend/ ./frontend/

# Install dependencies
RUN npm ci

# Build Next.js frontend and its dependencies
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npx turbo run build --filter=@pulsewatch/frontend...

# ==========================================
# STAGE 2: Production Runner
# ==========================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV PATH="/app/node_modules/.bin:$PATH"

RUN apk add --no-cache dumb-init curl
USER node

COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/frontend ./frontend

WORKDIR /app/frontend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "/app/node_modules/next/dist/bin/next", "start"]
