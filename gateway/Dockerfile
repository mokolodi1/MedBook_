FROM node:4

WORKDIR /app
RUN apt-get update
RUN apt-get install -y build-essential libkrb5-dev
ADD gateway/package.json /app/package.json
RUN npm install
RUN npm install -g node-dev #for hot reloads during development
ADD gateway /app/

CMD ["node", "Gateway.js"]

EXPOSE 10000
