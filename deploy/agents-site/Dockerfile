# 정적 랜딩(docs/)을 perso.ai/{lang}/dubbing/agents 경로 구조로 변환해 nginx 로 서빙.
# 빌드 컨텍스트는 레포 루트:
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
