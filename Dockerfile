# ---------- Builder Stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

# install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# copy dependency files
COPY package.json pnpm-lock.yaml ./

# install dependencies
RUN pnpm install --frozen-lockfile

# copy source
COPY . .


# generate prisma client
RUN npx prisma generate

# build typescript
RUN pnpm build


# ---------- Production Stage ----------
FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# copy only necessary files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma

# expose port
EXPOSE 4040

# start server
CMD ["pnpm", "start"]
