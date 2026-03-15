# ---------- Builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN pnpm build


# ---------- Runtime ----------
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm prisma
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
COPY .env.production .env.production

RUN addgroup -S nodejs -g 1001
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
RUN chmod +x ./entrypoint.sh

USER nodejs

EXPOSE 4040

ENTRYPOINT ["./entrypoint.sh"]
