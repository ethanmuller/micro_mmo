# Multiplayer (socket.io) server. The frontend is built statically and deployed separately.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ts-node type-checks the server, which imports types from src/game
COPY tsconfig.json tsconfig.node.json ./
COPY src ./src

USER node
EXPOSE 3000

CMD ["node", "--loader", "ts-node/esm", "src/server/multiplayer-server.ts"]
