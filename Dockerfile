# Use Node 21 alpine as parent image
FROM node:21-alpine

# Create directories application 
RUN mkdir -p /home/node/app/node_modules

# Change the working directory on the Docker image to /app
WORKDIR /home/node/app

# Copy package.json and package-lock.json to the /app directory
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Install PM2
RUN npm install pm2 -g

# Copy the rest of project files into this image
COPY . .

# Expose application port
EXPOSE 3000

# Start the application
CMD ["pm2-runtime", "process.json"]