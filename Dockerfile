FROM node:20-alpine AS build

# Set the working directory inside the container.
WORKDIR /app

# Copy the package.json and package-lock.json files.
COPY package*.json ./

# Install the project dependencies.
RUN npm install

# Copy the rest of your application's source code into the container.
COPY . .

# Build the React app for production.
RUN npm run build

# --- Production Stage ---
# Use a lightweight Nginx server to host the static files.
FROM nginx:1.25-alpine

# Copy the built static files from the 'build' stage into the Nginx server's
# public directory. The output directory for Vite is 'dist'.
COPY --from=build /app/dist /usr/share/nginx/html

# Tell Docker that the container listens on port 80.
EXPOSE 80

# The command to start the Nginx server when the container launches.
CMD ["nginx", "-g", "daemon off;"]

# The Nginx image is configured to expose port 80 by default.
# This command starts the Nginx server in the foreground.

CMD ["nginx", "-g", "daemon off;"]
