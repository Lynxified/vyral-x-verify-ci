FROM mcr.microsoft.com/playwright:v1.45.0-noble

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY scraper.js .

CMD ["node", "scraper.js"]
