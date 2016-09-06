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
# Patch to help avoid EXDEV errors when updating npm packages
ADD patch /tmp/patch
RUN patch /root/.meteor/packages/meteor-tool/1.3.5_1/mt-os.linux.x86_64/tools/fs/files.js  /tmp/patch

WORKDIR /app

EXPOSE 3000
ENV PORT 3000

# Apps should be given a build context of the base directory so that the 
# packages/ dir is included; this allows it to be added to the same volume as
# the rest of the app and helps avoid EXDEV errors when meteor tries to update
# packages.
# This makes it necessary to specify which app is being built so that docker
# imports the correct webapp folder.
# To specify appdir when building child images:
# --build-arg appdir=foo
ONBUILD ARG appdir=.
ONBUILD ADD $appdir/webapp /app
ONBUILD ADD packages/ /app/packages/
ONBUILD RUN mkdir /bundle
ONBUILD RUN meteor build --directory /build
ONBUILD WORKDIR /build/bundle/programs/server

ONBUILD RUN npm install
ONBUILD WORKDIR /build/bundle

CMD node main.js
