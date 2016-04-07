FROM ubuntu:14.04
MAINTAINER Mike Risse

RUN apt-get update
RUN apt-get install -y curl patch python
RUN curl https://install.meteor.com | /bin/sh
ADD packages /app/.meteor/packages
ADD release /app/.meteor/release 
WORKDIR /app
RUN meteor build .
ADD patch /tmp/patch
RUN patch /root/.meteor/packages/meteor-tool/.1.1.3.*os.linux.x86_64+web.browser+web.cordova/mt-os.linux.x86_64/tools/files.js  /tmp/patch

WORKDIR /app

EXPOSE 3000
ENV PORT 3000

RUN apt-get update
RUN apt-get install -y build-essential

ONBUILD ADD ./webapp /app
ONBUILD RUN mkdir /bundle
ONBUILD RUN meteor build --directory /build
ONBUILD WORKDIR /build/bundle/programs/server
ONBUILD RUN `find ~/.meteor -path "*dev_bundle/bin/npm" | grep "1.1.3"` install
ONBUILD WORKDIR /build/bundle

CMD ["node", "main.js"]