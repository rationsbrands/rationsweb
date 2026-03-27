# Stage 1: Build Phase
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Only copy package dependencies first for caching layers
COPY package*.json ./
RUN npm ci

# Copy full source and build
COPY . .
RUN npm run build

# Stage 2: Production Execution
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Install only production dependencies securely
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled bytecode/transpiled dist from builder
COPY --from=builder /usr/src/app/dist ./dist

# Security: Run as non-root node user provided by the alpine node image
RUN chown -R node:node /usr/src/app
USER node

# Expose production port
EXPOSE 6002

# Execute the application
CMD ["node", "dist/src/index.js"]
