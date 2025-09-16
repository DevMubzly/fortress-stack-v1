FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

COPY src/fonts ./src/fonts

EXPOSE 3000

CMD ["npm", "start"]