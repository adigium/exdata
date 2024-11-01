# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies including dev dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN pnpm run build

# Production Stage
FROM node:20-alpine

USER node
WORKDIR /home/node/app
EXPOSE 4000

USER root
RUN npm install -g pnpm && chown -R node:node /home/node/app
USER node

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

CMD ["node", "--inspect=0.0.0.0:9229", "--max-old-space-size=8192", "build/index.cjs"]