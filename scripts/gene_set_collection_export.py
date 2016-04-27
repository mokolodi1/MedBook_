#! /usr/bin/env python

"""Export MedBook expression3 data into rectangular files.

Usage:
./gene_set_collection_export.py [gene set collection id]

Dependancies:
pymongo
"""

#./expression3_export.py --sample_label [sample label] --study_label [study label] [output]"""

import sys
import getopt
import pymongo

def exportGeneSetCollection(db, geneSetCollectionId):
    cursor = db["gene_sets"].find({ "gene_set_collection_id": geneSetCollectionId })

    for doc in cursor:
        sys.stdout.write(doc["name"] + "\t")
        sys.stdout.write(doc["description"] + "\t")
        sys.stdout.write("\t".join(doc["gene_labels"]) + "\n")

def main():
    argv = sys.argv

    # set up the database client
    db = pymongo.MongoClient()["MedBook"]

    if len(argv) == 2:
        exportGeneSetCollection(db, argv[1])

        sys.exit(0)

    print __doc__

if __name__ == "__main__":
    main()
