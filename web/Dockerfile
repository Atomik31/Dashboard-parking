# Image de production : build Vite puis serveur Express (sert web/dist), port interne 3000.
# Construite par le docker-compose.yml racine (contexte `#main:web`) lors du déploiement automatique.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY shared ./shared
COPY src ./src
# Config web Firebase injectée au build (args du docker-compose.yml, valeurs lues dans le .env du VPS).
# La clé API n'est volontairement pas dans le dépôt.
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN=parking-aixpress.firebaseapp.com
ARG VITE_FIREBASE_PROJECT_ID=parking-aixpress
ARG VITE_FIREBASE_APP_ID=1:490680213265:web:757b0ffc9f794934e5f6b0
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
RUN test -n "$VITE_FIREBASE_API_KEY" || (echo 'VITE_FIREBASE_API_KEY manquant (build-arg)' >&2; exit 1)
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY shared ./shared
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
