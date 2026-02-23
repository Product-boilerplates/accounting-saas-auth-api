# ---------- Builder ----------
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build


# ---------- Runtime ----------
FROM node:18-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 4001

CMD sh -c "npx prisma migrate deploy && node dist/main.js"
