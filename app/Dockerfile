FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY src ./src

# Expose port
EXPOSE 3000

# Start the application
CMD ["bun", "src/index.ts"]
