#!/bin/bash

# Run on prod.
# Give it a list of mongo IDs, and it will pull them all into TSVs
# that go into the results/ subdir.

# usage
# do_all_oa.sh < FILE
# FILE contains the outlier analysis job IDs, one per line
mkdir -p results
while read line;
do
  ./get_oa.sh $line
done
mv *.tsv results/
