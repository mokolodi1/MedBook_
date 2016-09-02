FROM node:0.10.46
MAINTAINER Mike Risse

RUN apt-get update
RUN apt-get install -y curl patch python build-essential imagemagick
ADD installMeteor.sh /tmp/installMeteor.sh
RUN sh /tmp/installMeteor.sh

ADD packages /app/.meteor/packages
ADD release /app/.meteor/release 
WORKDIR /app
RUN meteor build .
# ADD patch /tmp/patch
# RUN patch /root/.meteor/packages/meteor-tool/1.1.10.*os.linux.x86_64+web.browser+web.cordova/mt-os.linux.x86_64/tools/files.js  /tmp/patch

WORKDIR /app

EXPOSE 3000
ENV PORT 3000

# temp - add to jobrunner instead

#ONBUILD ADD ./webapp /app
#ONBUILD RUN mkdir /bundle
#ONBUILD RUN meteor build --directory /build
#ONBUILD WORKDIR /build/bundle/programs/server

#ONBUILD RUN npm install
#ONBUILD WORKDIR /build/bundle

CMD node main.js
