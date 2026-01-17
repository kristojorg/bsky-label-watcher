# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS prod-deps
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# bundle the application
FROM base AS builder
COPY . .
RUN bun build src/main.ts --outfile=dist/main.js --target=bun --minify

# copy production dependencies and bundle into final image
FROM oven/bun:1-alpine AS release
WORKDIR /usr/src/app

COPY --from=prod-deps /temp/prod/node_modules node_modules
COPY --from=builder /usr/src/app/dist/main.js .

# All data (logs and cursor) need to be placed under /var/data
RUN mkdir -p /var/data/ && chown bun:bun /var/data/

USER bun
EXPOSE 3000/tcp
EXPOSE 9464/tcp
ENTRYPOINT [ "bun", "--smol", "main.js" ]
