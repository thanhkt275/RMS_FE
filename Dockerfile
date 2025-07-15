# --- Dependencies Stage ---
# --- Dependencies Stage ---
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY .env.production .env.production
RUN npm ci --legacy-peer-deps
ENV NODE_ENV=production
    # Install dependencies for 'sharp' (for image optimization)
RUN apk add --no-cache libc6-compat
    
    # --- Build Stage ---
FROM node:18-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY .env.production .env.production 
ENV NODE_ENV=production
RUN npm run build
    
    # --- Production Stage ---
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
    
    # Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps
    
    # Copy built assets and public folder
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
    
    # Copy env file
COPY --from=build /app/.env.production .env.production
    
EXPOSE 3000
CMD ["npm", "start"]
    
