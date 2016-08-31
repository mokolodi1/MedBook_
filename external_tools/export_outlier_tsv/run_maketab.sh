#!/bin/bash

# replace PRODNAME, DIR, and STORAGENAME & STORAGEDIR
# with appropriate values

ssh PRODNAME "cd DIR; ./get_oa.sh $1"
sftp PRODNAME <<EOF
cd DIR
get *.tsv
EOF
sftp STORAGENAME << EOF
cd STORAGEDIR
put *.tsv
EOF
mv *.tsv already_transferred/
