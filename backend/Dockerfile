FROM node:22-slim

# Prisma necesita OpenSSL y la imagen slim no lo trae.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# El postinstall corre prisma generate, que necesita el esquema.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

# El seed se puede repetir: no duplica datos ni pisa los cambios hechos desde la app.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && node dist/main"]
