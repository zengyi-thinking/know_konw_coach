FROM node:20-alpine

WORKDIR /app

COPY package.json ./package.json
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY docs ./docs

ENV NODE_ENV=production
ENV PORT=8080
ENV LIFECOACH_PLATFORM_PORT=8080
ENV LIFECOACH_CONTROL_PLANE_DATA=/data/control-plane.json
ENV LIFECOACH_CONTROL_PLANE_STATE_ROOT=/data/state

RUN mkdir -p /data/state

EXPOSE 8080

CMD ["node", "apps/platform/server.js"]
