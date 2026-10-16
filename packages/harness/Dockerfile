FROM node:22-slim AS build
WORKDIR /app
# Install the application dependencies
COPY package.json package-lock.json tsconfig.json ./
COPY packages/core packages/core
COPY packages/harness packages/harness
RUN npm ci
RUN npm run build -w @agent-lab/core -w @agent-lab/harness


FROM node:22-slim
RUN apt-get update && \
    apt-get install -y --no-install-recommends git ripgrep && \
    rm -rf /var/lib/apt/lists/*

# App code lives in /app (agent can't reach it)
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/core /app/packages/core
COPY --from=build /app/packages/harness /app/packages/harness

# Agent's sandbox: empty folder it owns
RUN mkdir -p /workspace && chown node:node /workspace
WORKDIR /workspace

# Setup an app user so the container doesn't run as the root user
USER node
CMD ["node", "/app/packages/harness/dist/cli.js"]
