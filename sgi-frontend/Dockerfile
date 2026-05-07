# ============================================
# Frontend Dockerfile — Next.js (standalone)
# ============================================

# 1. Instalar dependencias
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Build de producción
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno para el build (Next.js las incrusta en el bundle)
ARG API_URL=http://localhost:8000/api/v1
ARG JWT_SECRET
ENV API_URL=${API_URL}
ENV JWT_SECRET=${JWT_SECRET}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# 3. Imagen de producción ultra-ligera
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar solo lo necesario de standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
