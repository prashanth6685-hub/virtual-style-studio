# ---- Build stage: install everything, generate Prisma client, build all workspaces
FROM node:20-alpine AS build
WORKDIR /app

# Prisma's engines need OpenSSL (not shipped in Alpine slim images)
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY server/prisma server/prisma
COPY server/tsconfig.json server/vitest.config.ts server/
RUN npx prisma generate --schema server/prisma/schema.prisma
COPY server/src server/src
RUN npm run build --workspace @vss/shared && npm run build --workspace @vss/server

COPY client client
RUN npm run build --workspace @vss/client

# ---- Runtime stage: production deps only + built output
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prisma's engines need OpenSSL (not shipped in Alpine slim images)
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY server/package.json server/
RUN npm ci --omit=dev && npm cache clean --force

# Prisma CLI for `migrate deploy` at container start
RUN npm install -g prisma@5.22.0 && npm cache clean --force

# Generated Prisma client (engines + generated sources) from the build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/client/dist ./client/dist

# Uploaded photos (ephemeral on free-tier hosts without a persistent disk)
RUN mkdir -p /app/uploads

EXPOSE 4000
CMD ["sh", "-c", "prisma migrate deploy --schema /app/server/prisma/schema.prisma && node /app/server/dist/index.js"]
