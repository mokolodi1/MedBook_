FROM medbook/meteor-base:meteor1.3_v1.0.0
MAINTAINER Mike Risse

# Build patient-care for 1.3.

# Install python requirements (for downloading)
RUN apt-get install -y --force-yes --no-install-recommends \
    python-pip \
    python-dev \
    build-essential
RUN easy_install pip
RUN pip install --upgrade virtualenv
RUN pip install pymongo
