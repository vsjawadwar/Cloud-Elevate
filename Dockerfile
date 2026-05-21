# ── Build stage ───────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

RUN npm install --workspace=backend --workspace=shared

COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/
COPY shared/src ./shared/src

RUN cd backend && npm run build

# ── Production stage ──────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY shared/src ./shared/src

RUN npm install --workspace=backend --workspace=shared --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 4000

CMD ["node", "backend/dist/index.js"]
