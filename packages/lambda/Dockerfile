FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY packages/core packages/core
COPY packages/harness packages/harness
COPY packages/lambda packages/lambda
RUN npm ci
RUN npm run build -w @agent-lab/core -w @agent-lab/harness -w @agent-lab/lambda

FROM public.ecr.aws/lambda/nodejs:22
RUN dnf install -y git && dnf clean all
COPY --from=build /app/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY --from=build /app/packages ${LAMBDA_TASK_ROOT}/packages
CMD ["packages/lambda/dist/harness-lambda.handler"]
