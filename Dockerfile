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

# 端口配置：默认8080与本地/VPS文档一致，平台可通过环境变量覆盖
ARG PORT=8080
ENV NODE_ENV=production
ENV PORT=${PORT}

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

# 默认暴露端口
EXPOSE 8080
CMD ["node", "server/index.mjs"]
