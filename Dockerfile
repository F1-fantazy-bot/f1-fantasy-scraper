# Node 20 + Chromium pre-installed
FROM ghcr.io/puppeteer/puppeteer:latest

# Gain root only while adding files
USER root
WORKDIR /usr/src/app

# Install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY index.js .
COPY src ./src

# Drop back to the hardened non-root user
USER pptruser

# Install Chrome for Puppeteer as pptruser
RUN npx puppeteer browsers install chrome

CMD ["node", "index.js"]
