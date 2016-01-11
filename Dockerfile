FROM node:4

WORKDIR /app
RUN apt-get update
RUN apt-get install -y build-essential libkrb5-dev
ADD package.json /app/package.json
RUN npm install
ADD . /app/

CMD ["node", "Gateway.js"]

EXPOSE 10000
