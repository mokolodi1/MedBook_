FROM medbook/meteor-base:meteor1.3_v1.0.0
MAINTAINER Mike Risse

# Build patient-care for 1.3.
# Install python requirements (for downloading)
RUN apt-get update && apt-get install -y --force-yes --no-install-recommends \
    python-pip \
    python-dev \
    build-essential
RUN easy_install pip
RUN pip install --upgrade virtualenv
RUN pip install pymongo

# copy in export scripts
# NOTE: relative to path when docker-compose is called
COPY tools/exporters /tools/exporters


# Highly experimental: maybe if we run meteor update when we're
# building the container (not in the app dir, just wherever we are),
# that will stop the tests from trying to download the new version of meteor-tool.
# I don't know that it will make it faster overall because now meteor-tool will just be
# downloaded in the docker build step instead, but if it causes a change in the relative times
# of the steps we can observe that.
# Let's try it as the superuser since everything inside the docker seems to get run as root anyhow
#RUN meteor --allow-superuser update
