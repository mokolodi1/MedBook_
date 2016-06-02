#! /bin/sh

# ex.
# ./get_data_set_sample_labels.sh [file name] | pbcopy

# `sed` gets rid of "Gene ID" column and replaces it with an open bracket

head -1 $1 | tr "\t" "\n" | awk '{ print "\t\""$0"\","}' | sed "1s/.*/[/"

>&2 echo 'db.data_sets.update({ _id: "CHANGEME" }, {
  $set: {
    sample_labels: PASTEHERE,
    gene_expression: PASTEHERE,
  }
});

// in a `meteor shell`
MedBook.referentialIntegrity.dataSets_expression3("CHANGEME")'
