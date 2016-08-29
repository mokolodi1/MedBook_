#!/bin/bash

echo $1
query="{_id:'"$1"'},{'output.up_genes':1, 'output.down_genes':1}"
#cmd='mongoexport --host mongo -d MedBook -c jobs -q "'$query'"'
#echo $cmd
mongoexport --host mongo -d MedBook -c jobs -q "$query" > result.json
python outlier_json_to_tsv.py
