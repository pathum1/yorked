FROM node:20-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# --- Install server dependencies ---
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --production

# --- Install client dependencies and build ---
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# --- Copy server source and scripts ---
COPY server/ ./server/
COPY scripts/seedDatabase.js ./scripts/seedDatabase.js
COPY scripts/players_seed.json ./scripts/players_seed.json

# The data directory is mounted as a volume
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/yorked.db

EXPOSE 3001

CMD ["node", "server/index.js"]
