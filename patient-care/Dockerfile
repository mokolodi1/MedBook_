FROM medbook/meteor-base:meteor1.3_v1.0.1
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
