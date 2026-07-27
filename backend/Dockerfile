FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

RUN npm install -g pnpm

COPY package.json ./
RUN pnpm install

COPY . .

RUN pnpm prisma:generate

EXPOSE 3000

CMD ["pnpm", "start:dev"]
