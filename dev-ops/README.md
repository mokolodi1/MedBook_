# MedBook DevOps

## Creating a new Azure box

1. Create box on Azure portal
- Point DNS record to box's IP [here](https://domains.google.com/registrar#d=3530982,medbook.io&z=a&chp=d,z)
- Add drives to box (see: [this section](#connected-drives))
- Set up box with ansible: `ansible-playbook playbook.yml -i hosts -u ubuntu`
- Add necessary ssh keys to box

## Connected drives

Drives should be connected on Azure in the order listed below in order to be named accordingly in the Azure portal. (Currently the ansible script attaches the drives via `/dev/sdX` listing, where `X` is a sequential letter as drives are attached.)

| Location          | Size   | Production | Staging | Development | Backup | Description |
| --------          | ------ | ---------- | ------- | ----------- | ----------- |
| `/var/lib/docker` | 512 gb | Yes | Yes | Yes | No | extra space for docker images, containers, etc.
| `/filestore`      | 512 gb | Yes | Yes | No | No | extra space for files stored as blobs
| `/backup`         | 512 gb | Yes | No | No | No | dedicated space to perform backups
| `/backups`        | 512 gb | No | No | No | Yes | dedicated space to store backups
