# Meteor docker image base (`medbook/meteor-base`)

## Rebuilding

```sh
# clone from GitHub
git clone https://github.com/UCSC-MedBook/meteor-docker-image

# decide on the tag
TAG=medbook/meteor-base:meteor1.3_v1.0.1

# build (and tag the build with $TAG)
docker build -t $TAG .

# login and push to Docker Hub
docker login --username=mokolodi1
docker push $TAG .
```
