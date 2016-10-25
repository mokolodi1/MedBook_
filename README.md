# MedBook_

[![Build Status](https://travis-ci.org/UCSC-MedBook/MedBook_.svg?branch=master)](https://travis-ci.org/UCSC-MedBook/MedBook_)
[![Stories in Ready](https://badge.waffle.io/UCSC-MedBook/MedBook.png?label=ready&title=Ready)](https://waffle.io/UCSC-MedBook/MedBook)

To build in docker and run:
```sh
git clone https://github.com/UCSC-MedBook/MedBook

docker-compose -f docker-compose-build.yml build
docker-compose -f docker-compose-mongo.yml up -d

./scripts/prodStart.sh
```

[For setting up a new production machine, see here.](dev-ops/README.md)
