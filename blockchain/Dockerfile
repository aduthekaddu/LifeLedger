FROM node:18-alpine

WORKDIR /app

# Copy pacckage files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy contract files
COPY . .

# Compile contracts
RUN npx hardhat compile

# Expose Hardhat node port
EXPOSE 8545

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
