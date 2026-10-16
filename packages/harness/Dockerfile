FROM node:22-slim AS build
WORKDIR /app
# Install the application dependencies
COPY package.json package-lock.json tsconfig.json ./
COPY packages/core packages/core
COPY packages/harness packages/harness
COPY .gitignore ./
RUN npm ci
RUN npm run build -w @agent-lab/core -w @agent-lab/harness


FROM node:22-slim
# Update package lists and install git and ripgrep
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    ripgrep && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /workspace && chown node:node /workspace
WORKDIR /workspace
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/core ./packages/core
COPY --from=build /app/packages/harness ./packages/harness

# Setup an app user so the container doesn't run as the root user
USER node

CMD ["node", "packages/harness/dist/run-task.js"]
