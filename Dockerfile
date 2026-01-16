# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
# install with --production (exclude devDependencies)
FROM base AS prod-deps
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy production dependencies and source code into final image
FROM base AS release
COPY . .
COPY --from=prod-deps /temp/prod/node_modules node_modules
# All data (logs and cursor) need to be placed under /var/data
RUN mkdir -p /var/data/ && chown bun:bun /var/data/

# run the app
USER bun
EXPOSE 3000/tcp
EXPOSE 9464/tcp
ENTRYPOINT [ "bun", "run", "src/main.ts" ]