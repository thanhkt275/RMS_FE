
# Install dependencies only when needed
FROM node:20-alpine AS deps
WORKDIR /app

# Add build arguments for environment variables
ARG NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG JWT_SECRET

# Set environment variables for the build
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV JWT_SECRET=$JWT_SECRET

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app

# Add build arguments for environment variables
ARG NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG JWT_SECRET

# Set environment variables for the build
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV JWT_SECRET=$JWT_SECRET

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy .env file if it exists (after copying source files)
COPY .env* ./

# Install dependencies again to ensure everything is available
RUN npm ci --only=production

RUN npm run build

# Production image
FROM node:20-alpine AS runner

# Add build arguments for environment variables
ARG NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG JWT_SECRET

# Set environment variables for runtime
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV JWT_SECRET=$JWT_SECRET

# Enable standalone mode
WORKDIR /app

# Only copy necessary files for production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy .env file from builder stage
COPY --from=builder /app/.env* ./

# Port your Next.js app runs on
EXPOSE 3000

CMD ["npm", "start"]
