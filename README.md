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

### Setting up cBioPortal
```sh
# move the sql db to where you can restore it from
mv dump.sql /mnt/mysql-dump

# start the mysql container (as well as the other apps)
docker-compose up

# connect to the sql database and restore from dump.sql
docker exec -it mysql /bin/bash

# restore from dump.sql from within the docker container (uncompressed)
mysql -h localhost -u cbio -pP@ssword1;
use cbioportal; # `CREATE DATABASE CBIOPORTAL` if it doesn't exist already
source /mysql-dump/dump.sql;

# restore from dump.sql.gz within the docker container (compressed)
zcat /mysql-dump/dump_new.sql.gz | mysql -h localhost -u cbio -pP@ssword1 cbioportal
```

## Backups

Backups are created [every day at 3:30 am](https://github.com/UCSC-MedBook/MedBook/blob/master/scripts/create_backup.sh#L13). Currently backups are not deleted, and we will run out of space for backups around October 20th.

The backup files are stored here: `backup.medbook.io:/backups`. `/backups` is a 500gb volume mounted using Azure. The production box has ssh access to `backups.medbook.io` if access needs to be granted to other machines.

#### Manually creating a backup

`~/MedBook/scripts/create_backup.sh` will create a backup from mongo and `/filestore`.

A couple notes/gotchas:
- Backups are named as follows: backup.[hostname].[year]-[month]-[day]_[hour]-[minute]-[second]
- Backups on the production machine run at `/backup` (a mounted disk) so there's enough space to dump and compress the database.
- When a backup is run on the production machine (`HOSTNAME="medbook-prod"`) the backup is restored on staging as part of the backup script.
- The mongo host is assumed to be `localhost` except for on `medbook-prod` (medbook.io) and `medbook-staging-2` (staging.medbook.io), where the hostname is hardcoded as `mongo` and `mongo-staging` respectively.
- Anyone can create a backup from any machine, so long as they have `scp` access to `backup.medbook.io`. This could be useful if someone had run a migration and wanted to share the migrated data with someone.

#### Manually restoring from a backup

`~/MedBook/scripts/restore_from_backup.sh [backup name]` will restore from the specified backup. Do not include `.tgz` in the backup name.

The restore command *deletes everything* in the mongo database as well as `/filestore` and then replaces it with the backup's data.

Currently the only way to view stored backups is by `ssh`ing into `backup.medbook.io`. On that box, the backups are stored at `/backups`.

Technically, all apps should be stopped before restoring from a backup. Currently, they aren't stopped on staging when we restore at ~4 am because no one is using staging at that time and it hasn't caused any problems yet. Problems could arise if a user created objects (or created a new user) before the new mongo data was restored, which would cause the `mongorestore` command to fail.
