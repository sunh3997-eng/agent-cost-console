FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# ─── Install deps ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/proxy/package.json packages/proxy/
RUN npm install --workspace=packages/shared --workspace=packages/proxy

# ─── Build ───────────────────────────────────────────────────────────────────
FROM deps AS build
COPY packages/shared/src packages/shared/src
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/proxy/src packages/proxy/src
COPY packages/proxy/tsconfig.json packages/proxy/
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/proxy

# ─── Runtime ─────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/packages/proxy/dist ./dist
COPY --from=build /app/packages/proxy/node_modules ./node_modules
RUN mkdir -p /app/data

EXPOSE 4000
CMD ["node", "dist/index.js"]
