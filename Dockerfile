# Build da API em Node 22 (imagem enxuta, usuário sem privilégios)
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# O npm precisa dos manifestos dos dois workspaces para resolver o lockfile,
# mas apenas as dependências de produção do servidor são instaladas.
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm ci --omit=dev --workspace server && npm cache clean --force

COPY server/src ./server/src
COPY server/sql ./server/sql

USER node

EXPOSE 3000

CMD ["sh", "-c", "node server/src/db/migrate.js && node server/src/server.js"]
