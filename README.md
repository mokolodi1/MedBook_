# cBioPortal | Dockerized Automated Build Implementation

## Introduction

This project is an open source dockerized automated build implementation of the cBioPortal developed by MSKCC, enabling researchers to create their own internal version of cBioPortal with a single command line.

[Github Project](https://github.com/ElementoLab/cbioportal)    
[Docker Automated Build](https://hub.docker.com/r/elementolab/cbioportal/)

## What is cBioPortal?

The cBioPortal for Cancer Genomics provides visualization, analysis, and download of large-scale cancer genomics data sets. The cBioPortal is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License, version 3, as published by the Free Software Foundation.

The cBioPortal for Cancer Genomics is developed and maintained by the Center for Molecular Oncology and the Computational Biology Center at Memorial Sloan-Kettering Cancer Center.

Learn more about cBioPortal

[Public cBioPortal](http://www.cbioportal.org)    
[cBioPortal Github](https://github.com/cBioPortal/cbioportal)

## What is Docker?

Docker is an open-source project that automates the deployment of applications inside software containers, by providing an additional layer of abstraction and automation of operating-system-level virtualization on Linux. Docker uses the resource isolation features of the Linux kernel such as cgroups and kernel namespaces, and a union-capable filesystem such as aufs and others to allow independent "containers" to run within a single Linux instance, avoiding the overhead of starting and maintaining virtual machines.

#### Learn more about Docker:
[Docker Home Page](https://www.docker.com)  
[Docker Run Reference](https://docs.docker.com/engine/reference/run/)

## Why a Docker Automated Build?

#### Automated Builds have several advantages:

- Images built in this way are built exactly as specified.
- The Dockerfile is available to anyone with access to the Docker Hub repository.
- The repository is kept up-to-date with code changes automatically.

## 1. cBioPortal DB Setup

cBioPortal requires MySQL to be installed.


# Work In Progress...

### Option 1 | MySQL running in Host

-- Add instructions on how to run on host

### Option 2 | MySQL running with Docker


#### A. Setup a Docker Network

Because MySQL and cBioPortal are running on separate containers, there needs to be a method for linking them. Using Docker's --link flag tends to be fragile since it will break if the MySQL container is restarted. We can get around this by using Docker's network options.

```bash
docker network create cbio-net
```

#### B. Start a MySQL docker container:

```bash
docker run -d --name "cbioDB" \
	--restart=always \
	--net=cbio-net \
	-p 8306:3306 \
	-e MYSQL_ROOT_PASSWORD=P@ssword1 \
	-e MYSQL_USER=cbio \
	-e MYSQL_PASSWORD=P@ssword1 \
	-e MYSQL_DATABASE=cbioportal \
	-v /seed/DB/path:/cbioDB \
	mysql
```

#### C. Import Seed DB

```bash
docker exec -it cbioDB /bin/bash
```

gunzip cbioportal-seed.sql.gz

```bash
mysql --user=cbio --password=P@ssword1 cbioportal  < /cbioDB/cbioportal-seed.sql
```

[MySQL Docker Hub] (https://hub.docker.com/_/mysql/)    
[MySQL Docker Github] (https://github.com/docker-library/docs/tree/master/mysql)

## 2. Run cBioPortal

Start the cBioPortal Container

```bash
docker run -d --name "cbio" \
	--restart=always \
	--net=cbio-net \
	-p 8080:8080 \
	-v /custom_config/folder_path/:/custom_config/ \
	-v /customization/folder_path/:/custom_files/ \
	-v /logs/folder_path/:/cbio_logs/ \
	-v /studies/path:/cbio_studies/ \
	elementolab/cbioportal:0.1
```