FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost/api/v1
ARG VITE_PUBLIC_BASE_PATH=/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_BASE_PATH=$VITE_PUBLIC_BASE_PATH
ENV VITE_BUILD_OUT_DIR=/app/dist

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
