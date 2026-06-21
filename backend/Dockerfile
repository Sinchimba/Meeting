FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package.json ./
RUN npm ci --production --silent
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/main.js"]
