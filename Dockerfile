# --- Build Stage ---
# Use an official Node.js image to build the React application. This is a temporary environment.
FROM node:18-alpine AS build

# Set the working directory inside the container for the build process.
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker's caching.
# If these files don't change, Docker will reuse the cached layers, speeding up future builds.
COPY package*.json ./

# Install all project dependencies.
RUN npm install

# Copy the rest of your application's source code into the container.
COPY . .

# Build the React app for production. This command creates a 'build' folder
# containing the optimized static HTML, CSS, and JavaScript files.
RUN npm run build

# --- Production Stage ---
# Use a lightweight and high-performance Nginx image to serve the application.
FROM nginx:1.25-alpine

# Copy the static files generated in the 'build' stage into the Nginx web server's
# default directory for serving content.
COPY --from=build /app/build /usr/share/nginx/html

# The Nginx image is configured to expose port 80 by default.
# This command starts the Nginx server in the foreground.
CMD ["nginx", "-g", "daemon off;"]