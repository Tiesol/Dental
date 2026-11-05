FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite copia estos valores en el bundle al compilar, no se leen al ejecutar.
ARG VITE_API_URL
ARG VITE_CLINIC_TIMEZONE
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
