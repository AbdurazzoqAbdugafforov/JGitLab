FROM node:22-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN mkdir -p /app/workspaces /app/data

EXPOSE 8000

CMD ["npm", "run", "start:prod"]
