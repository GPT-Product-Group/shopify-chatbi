# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3300
RUN addgroup -S app && adduser -S app -G app

# 复制 Next standalone 输出
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
# 预创建数据目录（挂载持久化卷）
RUN mkdir -p /app/data

USER app
EXPOSE 3300
CMD ["node", "server.js"]
