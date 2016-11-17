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

### CBioUpdateData: import data into local copy of Cbioportal

This job exports data from mongo and runs Java code from cbioportal.org to load expression data clinical data from MedBook to Cbioportal

#### Arguments
job_name:"UpdateCbioData"
- `sample_group_id`: id of the sample group that defines which expression data will be loaded
- `form_id`: id of the clinical form for sample level data, sample_labels in this form must match sample labels from the sample_group defined above.
- `patient_form_id`: id of the clinical form with patient level attributes.
- `prerequisite_job_ids`: should be an empty list
- `collaborations`: group that will be defined in cbio to define user security. Should match the name of the collaboration in MedBook.
- `user_id`: user_id of user performing export, should have access to data.
- `timeout_length`: timeout job if it takes longer than this (milliseconds) recommended: 240000

[See here for Cbioportal importer tool documentation](https://cbioportal.readthedocs.io/en/latest/#data-loading).

#### Output

Creates a log file of the resulting run and stores it in a blob in mongo
