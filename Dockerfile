# One production image: the API, which also serves the built website.
#   docker compose up --build   (with Postgres, see docker-compose.yml)
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV WEB_DIST_DIR=/app/apps/web/dist

# Installed packages (pnpm keeps them in the root node_modules)
COPY --from=build /app/node_modules ./node_modules

# Shared package: compiled code only
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# API: compiled code + migrations
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/db ./apps/api/db

# Website: the built HTML, CSS and JS
COPY --from=build /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/api
EXPOSE 4000

# Run new migrations, then start the API
CMD ["sh", "-c", "./node_modules/.bin/dbmate --no-dump-schema --wait migrate && node dist/main.js"]
