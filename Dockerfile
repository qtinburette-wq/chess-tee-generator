FROM node:20-slim

WORKDIR /app

# Copy sources
COPY backend ./backend
COPY widget ./widget

# Build widget
WORKDIR /app/widget
RUN npm install
RUN npm run build

# Build backend
WORKDIR /app/backend
RUN npm install
RUN npm run build

# Start backend
EXPOSE 3000
CMD ["npm", "run", "start"]
