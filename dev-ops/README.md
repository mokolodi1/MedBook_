# MedBook DevOps

## Creating a new Azure box

1. Create a 16.04 Ubuntu VM on Azure portal
- Add drives to box (see: [this section](#connected-drives))
- Set up box with ansible: `ansible-playbook playbook.yml -i hosts -u ubuntu`
- Add necessary ssh keys to box (so that others can access it)
- Point DNS record to box's IP [here](https://domains.google.com/registrar#d=3530982,medbook.io&z=a&chp=d,z)
- Run ansible to set up machine (see: [here](#running-ansible))

## Connected drives

Drives should be connected on Azure in the order listed below in order to be named accordingly in the Azure portal. (Currently the ansible script attaches the drives via `/dev/sdX` listing, where `X` is a sequential letter as drives are attached.)

| Location          | Size   | Production | Staging | Mongo | Development | Backup | Description |
| ----------------- | ------ | ---------- | ------- | ----- | ----------- | ------ | ----------- |
| `/var/lib/docker` | 512 gb | Yes | Yes | Yes | Yes | No  | extra space for docker images, containers, etc.
| `/filestore`      | 512 gb | Yes | Yes | No  | No  | No  | extra space for files stored as blobs
| `/backup`         | 512 gb | Yes | No  | No  | No  | No  | dedicated space to perform backups
| `/backups`        | 512 gb | No  | No  | No  | No  | Yes | dedicated space to store backups
| `/data`           | 512 gb | No  | No  | Yes | No  | No  | where the mongo data lives

## Creating a new production machine

- [Create the Azure box](#creating-a-new-azure-box)
- Set incoming security rules in Azure (allow HTTP and HTTPS ports)
- Set up the box as a production server:

```sh
# make /filestore writable
sudo chown ubuntu /filestore

# move the filestore to the new machine for testing
rsync -rah ubuntu@medbook.io:/filestore /filestore

# move over secret set_up_environment.sh file
scp ubuntu@medbook.io:/home/ubuntu/set_up_environment.sh /home/ubuntu/

# edit set_up_environment.sh (we'll edit it back later)
# - change WORLD_URL as needed for testing (new.medbook.io is nice)
# - comment out Kadira information

# clone and start MedBook (not in deamon mode)
cd ~
git clone https://github.com/UCSC-MedBook/MedBook_
cd MedBook_
./scripts/prodStart.sh

# At this point you should test to make sure everything's working correctly
# - login
# - view job list and job detail
# - view an item on the "manage objects" page
# - download a blob
# - download a data set

# make sure these folders are mounted to disks (sometimes ansible fails):
# /filestore
# /var/lib/docker
# /backup
df -h

# set up backups (see create_backup.sh for cron command)
crontab -e

# run rsync for /filestore every 15 seconds as the hosts switch over
while sleep 15; do rsync -rah ubuntu@medbook.io:/filestore /filestore; done

# edit back set_up_environment.sh
# - change WORLD_URL
# - uncomment Kadira information

# restart the server in deamon mode
# NOTE: -d runs in deamon mode
./scripts/prodStart.sh -d

# change medbook.io DNS entry
# https://domains.google.com/registrar#d=3530982,medbook.io&z=a&chp=d,z
```

## cBioPortal

cBioPortal is currently only available to WCDT users. Only WCDT data should be loaded into cBioPortal though there is no software limit to which data can be loaded.

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

### Refreshing cBioPortal

**Any logged-in MedBook user may refresh cBioPortal.** Take this into consideration when granting access to MedBook, and double-check the validity of cBioPortal data if you suspect it may have been updated in error.

To refresh cBioPortal with the latest list of collaborators in the WCDT collaboration, run the following in the Javascript console while logged into MedBook.
```
Meteor.call("refreshCBioPortalAccess");
```

To refresh the cBioPortal with new data, run the following in the Javascript console while logged into MedBook. The job will wipe out the current `prad_wcdt` data and replace it with the new data.

This code snippet will open a new tab to view the log file for the job. This tab will display a 404 error initially; once the job finishes, a log file will be available at the URL opened. (You'll have to manually refresh the page.)

[See here for documentation of the arguments provided to `refreshCBioPortalData` (`form_id`, etc.).](/job-runner#cbioupdatedata-updatecbiodata)

```
Meteor.call("refreshCBioPortalData", {
  // replace these three IDs with the data you'd like to load
  form_id: "INSERT_ID_HERE",
  sample_group_id: "INSERT_ID_HERE",
  patient_form_id: "INSERT_ID_HERE"
}, (error, jobId) => {
  if (error) {
    console.log("ERROR:", error);
  } else {
    window.open(`${location.origin}/download/${Meteor.userId()}/${Accounts._storedLoginToken()}/job-blob/${jobId}/cbio_update_data_stdout.txt`);
  }
});
```

## Running Ansible

Ansible is a tool that does system administration for many remote boxes. Ansible should be run after setting up a new box to mount disks, install Docker, etc. It can be also used to make changes on all or many boxes at the same time.

To run the Ansible "playbook":

```sh
cd dev-ops
./runAnsible.sh
```

Note that the machine on which Ansible is run must have ssh access to all remote boxes.

## Backups

Backups are created [every day at 3:30 am](https://github.com/UCSC-MedBook/MedBook/blob/master/scripts/create_backup.sh#L13). Currently backups are not deleted, and we will run out of space for backups around October 20th.

The backup files are stored here: `backup.medbook.io:/backups`. `/backups` is a 500gb volume mounted using Azure. The production box has ssh access to `backups.medbook.io` if access needs to be granted to other machines.

#### Manually creating a backup

`~/MedBook/scripts/create_backup.sh` will create a backup from mongo and `/filestore`.

A couple notes/gotchas:
- Backups are named as follows: `backup.[hostname].[year]-[month]-[day]_[hour]-[minute]-[second]`
- Backups on the production machine run at `/backup` (a mounted disk) so there's enough space to dump and compress the database.
- When a backup is run on the production machine (`HOSTNAME="medbook-prod"`) the backup is restored on staging as part of the backup script.
- The mongo host is assumed to be `localhost` except for on `medbook-prod` (medbook.io) and `medbook-staging-2` (staging.medbook.io), where the hostname is hardcoded as `mongo` and `mongo-staging` respectively.
- Anyone can create a backup from any machine, so long as they have `scp` access to `backup.medbook.io`. This could be useful if someone had run a migration and wanted to share the migrated data with someone.

#### Manually restoring from a backup

`~/MedBook/scripts/restore_from_backup.sh [backup name]` will restore from the specified backup. Do not include `.tgz` in the backup name.

The restore command *deletes everything* in the mongo database as well as `/filestore` and then replaces it with the backup's data.

Currently the only way to view stored backups is by `ssh`ing into `backup.medbook.io`. On that box, the backups are stored at `/backups`.

Technically, all apps should be stopped before restoring from a backup. Currently, they aren't stopped on staging when we restore at ~4 am because no one is using staging at that time and it hasn't caused any problems yet. Problems could arise if a user created objects (or created a new user) before the new mongo data was restored, which would cause the `mongorestore` command to fail.

## Migrations

Migrations are one-off pieces of Javascript code which update mongo objects to a new schema. They should be run only when MedBook is offline (when all the docker containers have been stopped).

To run a migration:
```sh
// ssh onto the production machine
ssh ubuntu@medbook.io

// run the migration
mongo -host mongo MedBook < /path/to/migration/migration_name.js
```

### Full migration checklist

#### Applying a migration

1. test on devbox with db that has migration already applied
- code review, push to `master`, build new dockers
- check out `master` on staging
- apply migration to staging db
- spin up new dockers and test
- stop dockers on prod
- create a backup of the db
- apply migration
- spin up new dockers

#### Back out plan if migration fails

1. stop new dockers
- restore db from the fresh backup
- spin up old dockers
