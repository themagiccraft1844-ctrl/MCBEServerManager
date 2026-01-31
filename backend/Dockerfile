FROM node:18-alpine

WORKDIR /app

# Install build tools jika diperlukan oleh library native
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

# Expose port API
EXPOSE 5000

CMD ["npm", "start"]