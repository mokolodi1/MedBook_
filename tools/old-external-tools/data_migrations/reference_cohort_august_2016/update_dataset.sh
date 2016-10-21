#!/bin/bash


datasetId=$1

echo exporting datasets...
# PROD
#mongoexport --db MedBook --host mongo --collection data_sets > all_datasets

# staging
mongoexport --db MedBook --host mongo-staging --collection data_sets > all_datasets

echo finding dataset $datasetId ...
grep $datasetId all_datasets > dataset.json

echo updating dataset with samples...
./add_samples_to_dataset.py > dataset_with_samples.json

echo importing new dataset info...
#PROD
#mongoimport --db MedBook --host mongo --collection data_sets --file dataset_with_samples.json --upsert

#STAGING
 mongoimport --db MedBook --host mongo-staging --collection data_sets --file dataset_with_samples.json --upsert

echo now you import the gene expression connected to this dataset.
