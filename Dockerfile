# syntax=docker/dockerfile:1
# Iris: the Angular build served by the Node BFF. Two stages: build with every dependency, then run with production ones.
# ENVM selects the Angular configuration: development, dev, qa, dev-cloud, qa-cloud or production.
FROM node:24.18.0-alpine AS build
ARG ENVM=production
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY angular.json tsconfig*.json .postcssrc.json ./
COPY public ./public
COPY src ./src
RUN pnpm exec ng build --configuration "${ENVM}"
RUN pnpm prune --prod --ignore-scripts

FROM node:24.18.0-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json server.js ./
COPY server ./server
RUN rm -rf server/test
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
