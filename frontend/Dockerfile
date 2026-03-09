FROM node:22-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Vite application
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

# Install serve to serve the static built application
RUN npm install -g serve

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Expose port used by serve
EXPOSE 5173

# Command to run the frontend in production
CMD ["serve", "-s", "dist", "-l", "5173"]

FROM node:22-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
