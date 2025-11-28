# Stage 1: Build the Vue.js frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine
WORKDIR /app

# Install dependencies for the backend
COPY package.json package-lock.json ./
# We install all dependencies including devDependencies because miniflare is a devDependency
RUN npm install

# Copy backend code and schema
COPY functions ./functions
COPY schema.sql .

# Copy built frontend assets from the build stage
COPY --from=build /app/dist ./dist

EXPOSE 8787

# The command is specified in docker-compose.yml to include all arguments,
# but we provide a default here for running the container directly.
CMD ["sh", "-c", "npx miniflare functions/[[path]].js --host 0.0.0.0 --site ./dist --d1 MISUB_DB --d1-persist /var/lib/d1 --kv MISUB_KV --kv-persist /var/lib/kv"]
