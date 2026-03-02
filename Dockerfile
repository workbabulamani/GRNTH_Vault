FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server/ ./
COPY --from=client-build /app/client/dist ./public
RUN mkdir -p /app/data /app/uploads/images

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/md_viewer.db
ENV UPLOAD_DIR=/app/uploads/images

EXPOSE 3000
CMD ["node", "index.js"]
