# The API only (the website is on Netlify). Render builds this one:
#   Settings → Dockerfile Path: ./apps/api/Dockerfile (Docker build context: the repo root)
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable

COPY . .
# Only the API and what it uses (not the website or the phone app)
RUN pnpm install --frozen-lockfile --filter "@talaan/api..."
RUN pnpm --filter @talaan/shared build && pnpm --filter @talaan/api build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/db ./apps/api/db

WORKDIR /app/apps/api
EXPOSE 4000

# Run new migrations, then start the API
CMD ["sh", "-c", "./node_modules/.bin/dbmate --no-dump-schema --wait migrate && node dist/main.js"]
