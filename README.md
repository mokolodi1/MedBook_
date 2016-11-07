# MedBook_

[![Build Status](https://travis-ci.org/UCSC-MedBook/MedBook_.svg?branch=master)](https://travis-ci.org/UCSC-MedBook/MedBook_)
[![Stories in Ready](https://badge.waffle.io/UCSC-MedBook/MedBook.png?label=ready&title=Ready)](https://waffle.io/UCSC-MedBook/MedBook)

#### Build in docker and run:
```sh
git clone https://github.com/UCSC-MedBook/MedBook_.git

cd MedBook_

docker-compose -f docker-compose-build.yml build
docker-compose -f docker-compose-mongo.yml up -d

./scripts/prodStart.sh
```

#### Deploy to existing host, using Dockerhub images (without touching Mongo):
Update the checkout to get the latest image versions, then pull those images
```sh
cd MedBook_
git fetch
git pull
./dev-ops/prepare_for_deploy.sh
```
Enter tmux:
```sh
tmux a
```
Bring the existing dockers down:
*Ctrl-C in the appropriate tmux pane*

Bring the new dockers up:
```sh
./scripts/prodStart.sh
```
And exit tmux:
*Ctrl-b , then press d*

[For setting up a new production machine, see here.](dev-ops/README.md)

#### Documentation changes
For documention or devops-only changes that do NOT affect the docker images, add `[skip ci]` to the commit messages. This will prevent Travis from rebuilding (and if on master, pushing to dockerhub) the images.
