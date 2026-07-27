# Build context is the repo root:
#   docker build -f deploy/agents-site/Dockerfile -t dubbing-agents:local .
FROM node:20-alpine AS build
WORKDIR /src
COPY docs ./docs
COPY deploy/agents-site/build-site.mjs ./build-site.mjs
RUN node build-site.mjs docs /site

FROM nginx:1.27-alpine
COPY deploy/agents-site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site /site
EXPOSE 8080
