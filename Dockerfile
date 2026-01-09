FROM node:20-slim

WORKDIR /app

# Copy root files
COPY package*.json ./

# Copy backend and widget
COPY backend ./backend
COPY widget ./widget

# Install and Build Widget
WORKDIR /app/widget
RUN npm install
RUN npm run build

# Install and Build Backend
WORKDIR /app/backend
RUN npm install
RUN npm run build

# Environment
ENV PORT=3000
EXPOSE 3000

# Start
CMD ["node", "dist/index.js"]
