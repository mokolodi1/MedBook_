#! /usr/bin/env python

"""Export MedBook gene_set.

Usage:
./gene_set_export.py [gene set id] [field to sort on]

Dependancies:
pymongo
"""

import sys
import pymongo
import os

def exportGeneSet(db, geneSetId, rankingColumn):
    geneSet = db["gene_sets"].find_one({ "_id": geneSetId })

    recordsCursor = db["records"].find({
        "associated_object.collection_name": "GeneSets",
        "associated_object.mongo_id": geneSetId,
    }).sort([
        (rankingColumn, pymongo.DESCENDING)
    ])

    for record in recordsCursor:
        sys.stdout.write(record[geneSet["gene_label_field"]])
        sys.stdout.write("\t")
        sys.stdout.write(str(record[rankingColumn]))
        sys.stdout.write("\n")

def main():
    argv = sys.argv

    # set up the database client
    db = pymongo.MongoClient(os.getenv("MONGO_URL", "mongodb://mongo:27017/MedBook"))["MedBook"]

    if len(argv) == 3:
        exportGeneSet(db, argv[1], argv[2])

        sys.exit(0)

    print __doc__

if __name__ == "__main__":
    main()
