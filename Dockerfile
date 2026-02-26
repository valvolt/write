# Use lightweight Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files first to install deps (leverages Docker layer cache)
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm install --production

# Copy application source
COPY . .

# Ensure the stories directory exists
RUN mkdir -p ./stories

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]