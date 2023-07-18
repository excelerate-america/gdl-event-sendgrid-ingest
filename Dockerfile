# Use the official lightweight Node.js 18 image.
# https://hub.docker.com/_/node
FROM node:19-alpine

# Create and change to the app directory.
WORKDIR /app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./
COPY tsconfig.json ./

# Copy local code to the container image.
COPY . /app

# Install dependencies.
# If you add a package-lock.json speed your build by switching to 'npm ci'.
# RUN npm ci --only=production
RUN npm install 
RUN npm install -g typescript
RUN tsc

ENV PORT=8080
EXPOSE 8080
USER node

# Run the web service on container startup.
CMD ["node", "./dist/index.js"]
