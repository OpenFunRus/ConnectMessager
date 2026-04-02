FROM oven/bun:1.3.10 AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      python-is-python3 \
      python3-pip \
      python3-invoke \
      make \
      g++ \
      pkg-config && \
    rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock tsconfig.json ./
COPY apps/client/package.json apps/client/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/plugin-sdk/package.json packages/plugin-sdk/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN bun install --frozen-lockfile

COPY apps ./apps
COPY packages ./packages

RUN cd apps/server && bun run build:linux

FROM oven/bun:1.3.10

ENV RUNNING_IN_DOCKER=true

USER root

COPY --from=builder /app/apps/server/build/out/connectmessager-linux-x64 /connectmessager

RUN chmod +x /connectmessager && \
    chown bun:bun /connectmessager && \
    mkdir -p /home/bun/.config/connectmessenger && \
    chown -R bun:bun /home/bun/.config

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /home/bun

ENTRYPOINT ["/entrypoint.sh"]
