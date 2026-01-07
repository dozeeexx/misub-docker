FROM node:20-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN npm install

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/functions ./functions
COPY --from=build /app/server ./server
COPY --from=build /app/schema.sql ./schema.sql
COPY --from=build /app/src/shared ./src/shared
COPY --from=build /app/package.json ./package.json

EXPOSE 8787
CMD ["node", "server/index.mjs"]
