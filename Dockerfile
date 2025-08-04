# --- Dependencies Stage ---
FROM node:18-alpine AS deps
WORKDIR /app

# Install libc6-compat first for better caching
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with optimizations
RUN npm ci --only=production --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

# --- Build Dependencies Stage ---
FROM node:18-alpine AS build-deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

# --- Build Stage ---
FROM node:18-alpine AS build
WORKDIR /app

# Copy dependencies
COPY --from=build-deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Accept build-time environment variables
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache libc6-compat dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package.json for npm start
COPY --from=build --chown=nextjs:nodejs /app/package.json ./

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Copy Next.js config files
COPY --from=build --chown=nextjs:nodejs /app/next.config.* ./

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]