FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY . .

CMD ["node", "bin/mcp.js"]
