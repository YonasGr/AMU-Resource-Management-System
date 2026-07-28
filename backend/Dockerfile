FROM node:20-alpine

WORKDIR /app

# openssl: required by Prisma's query engine
# python3/make/g++: argon2 ships prebuilt binaries for most platforms, but
# falls back to compiling its native addon via node-gyp if none matches
RUN apk add --no-cache openssl python3 make g++

RUN npm install -g pnpm

COPY package.json ./
RUN pnpm install

COPY . .

RUN pnpm prisma:generate

EXPOSE 3000

CMD ["pnpm", "start:dev"]
