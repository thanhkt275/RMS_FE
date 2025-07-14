
# Install dependencies only when needed
FROM node:20-alpine AS deps
WORKDIR /app

# Add build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG JWT_SECRET
ARG NODE_ENV

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app

# Add build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG JWT_SECRET
ARG NODE_ENV

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create .env file from build arguments
RUN echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" > .env && \
    echo "NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL" >> .env && \
    echo "NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL" >> .env && \
    echo "JWT_SECRET=$JWT_SECRET" >> .env && \
    echo "NODE_ENV=$NODE_ENV" >> .env

RUN npm run build

# Production image
FROM node:20-alpine AS runner

# Enable standalone mode
WORKDIR /app

# Only copy necessary files for production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy .env file from builder stage
COPY --from=builder /app/.env ./

# Port your Next.js app runs on
EXPOSE 3000

CMD ["npm", "start"]
