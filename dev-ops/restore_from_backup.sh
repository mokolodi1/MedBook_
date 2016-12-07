#! /bin/bash

# WARNING: this will DELETE EVERYTHING, including mongo and the filestore.
#
# This script restores from a specific backup. First, it pulls the backup
# from our backup box (backup.medbook.io). Then it restores both mongo
# and the filestore from that backup.
#
# When running this on an Azure box, it's usually helpful to go to /mnt
# becasue there's lots of free space there.
#
# Usage: ./restore_from_backup.sh backup.medbook-prod.2016-07-28_13-12-28

backup_name=$1

# make sure they provide a backup to grab
if [ -z "$backup_name" ] ; then
  echo "Please specify a specific backup from which to restore."
  echo ""
  echo "Usage: ./restore_from_backup.sh backup.medbook-prod.2016-07-28_13-12-28";
  exit 1;
fi

# download the backup from the backup box
echo "Downloading backup..."
rsync "ubuntu@backup.medbook.io:/backups/$backup_name.tgz" .

# if the download failed, tell the user
if [ $? -ne 0 ] ; then
  echo "No backup found: $backup_name"
  exit 1;
fi

# uncompress the backup, delete compressed backup
echo "Extracting backup..."
tar zxf "$backup_name.tgz"
rm -rf "$backup_name.tgz"

# If we're on staging and there are docker containers running, stop them
# and restart them after the restore. Nothing special is required even if
# the images were originally started with docker-compose.
# see here for "string contains if": http://stackoverflow.com/a/24753942/1092640
should_restart_docker=""
to_restart_hashes=""
if [ $(docker ps | wc -l) -gt 1 ] ; then
  case "$HOSTNAME" in
  *staging*) should_restart_docker=true ;;
  esac
fi

if [ $should_restart_docker ] ; then
  to_restart_hashes=$(docker ps -q)
  docker stop $to_restart_hashes
fi

# go to the backup folder
cd "$backup_name"

# restore mongo
mongo_host="localhost"
if [ $HOSTNAME = "medbook-prod" ] ; then
  mongo_host="mongo"
elif [ $HOSTNAME = "medbook-prod-2" ] ; then
  mongo_host="mongo"
elif [ $HOSTNAME = "medbook-staging-3" ] ; then
  mongo_host="mongo-staging"
fi
mongo MedBook --host $mongo_host --eval "db.dropDatabase()"
mongorestore --drop --host $mongo_host

# restore the filestore
echo "Restoring filestore..."
sudo rsync -r filestore/ /filestore

# restart the images we stopped before the restore took place
if [ $should_restart_docker ] ; then
  echo "Restarting Docker containers..."
  docker start $to_restart_hashes
fi

# delete the uncompressed local backup
cd ..
echo "Deleting local backup..."
rm -rf "$backup_name"
