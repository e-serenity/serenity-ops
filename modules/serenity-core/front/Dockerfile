# syntax=docker/dockerfile:1

FROM node:26-alpine AS builder

WORKDIR /build

COPY app/package*.json ./
RUN npm ci

COPY app/ ./

ARG VITE_DEMO_MODE=true
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE

RUN npm run build

FROM scratch AS export
COPY --from=builder /build/dist /

FROM nginx:alpine-slim AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
