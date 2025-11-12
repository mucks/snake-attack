# Build stage
FROM node:20-alpine AS builder

# Install pnpm (pinned version for reliability)
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Next.js app
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

# Install pnpm (pinned version for reliability)
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

# Install ALL dependencies (including tsx which is needed to run server.ts)
# Do this BEFORE setting NODE_ENV=production
RUN pnpm install --frozen-lockfile

# Copy built Next.js app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/colyseus-server.ts ./colyseus-server.ts
COPY --from=builder /app/colyseus-server ./colyseus-server
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/tsconfig.server.json ./tsconfig.server.json

# Set production environment AFTER installing dependencies
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server (combines Next.js + Socket.IO)
CMD ["pnpm", "start"]

