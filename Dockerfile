# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-render.js ./server-render.js
COPY package*.json ./
RUN npm ci --only=production
EXPOSE 3001
CMD ["node", "server-render.js"]
