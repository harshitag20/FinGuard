FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./backend/
COPY shared/ ./shared/
WORKDIR /app/backend
RUN npm ci

COPY backend/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/shared ../shared
COPY backend/src/data ./src/data

EXPOSE 3001

CMD ["node", "dist/index.js"]

