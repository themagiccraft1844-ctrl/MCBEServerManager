FROM node:18-alpine

WORKDIR /app

# Install dependencies sistem
# python3, make, g++ diperlukan untuk rebuild native modules jika ada
# zip/unzip opsional karena kita pakai adm-zip di nodejs, tapi bagus untuk debug
RUN apk add --no-cache python3 make g++ zip

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Buat folder penting
RUN mkdir -p data uploads

EXPOSE 5000

CMD ["npm", "start"]