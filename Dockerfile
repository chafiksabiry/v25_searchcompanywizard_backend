FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway overrides this but good for doc)
EXPOSE 8080

# Start command
CMD ["npm", "start"]
