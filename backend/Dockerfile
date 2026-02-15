FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
