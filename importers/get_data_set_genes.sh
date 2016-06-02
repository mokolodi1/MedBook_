#! /bin/sh

# ex.
# ./get_data_set_genes.sh [file name] | pbcopy

# `sed` gets rid of "Gene ID" row and replaces it with an open bracket

cut -f 1 $1 | awk '{ print "\t\""$0"\","}' | sed "1s/.*/[/"

>&2 echo 'db.data_sets.update({ _id: "CHANGEME" }, {
  $set: {
    gene_expression_genes: PASTEHERE,
  }
});'
