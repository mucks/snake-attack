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

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

# Copy built Next.js app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.ts ./server.ts

# Install ALL dependencies (including tsx which is needed to run server.ts)
RUN pnpm install --frozen-lockfile

# Expose port
EXPOSE 3000

# Start the server (combines Next.js + Socket.IO)
CMD ["pnpm", "start"]

