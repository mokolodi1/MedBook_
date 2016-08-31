#!/bin/bash

# Usage: /new_samplegroups.sh NewCohortDatasetID OldCohortDatasetId
# export the sample groups using the targeted data set 
# use the OLD cohort dataset id
echo $2
query='{"data_sets.data_set_id" : "'$2'"}'
echo $query
#PROD
# mongoexport --host mongo -d MedBook -c sample_groups -q "$query" > fix_these_samplegroups
#staging 
mongoexport --host mongo-staging -d MedBook -c sample_groups -q "$query" > fix_these_samplegroups
python make_new_samplegroups.py $1 $2 > new_samplegroups.js
echo Make a snippet with new_samplegroups.js and run it in a logged-in browser client!
