#! /usr/bin/env python

"""Export MedBook gene_expression data into rectangular files.

Usage:
./gene_set_group_export.py [gene set collection id]

Dependancies:
pymongo
"""

import sys
import getopt
import pymongo
import os

def exportGeneSetGroup(db, geneSetGroupId):
    cursor = db["gene_sets"].find({ "gene_set_group_id": geneSetGroupId })

    for doc in cursor:
        sys.stdout.write(doc["name"] + "\t")
        sys.stdout.write(doc["description"] + "\t")
        sys.stdout.write("\t".join(doc["gene_labels"]) + "\n")

def main():
    argv = sys.argv

    # set up the database client
    db = pymongo.MongoClient(os.getenv("MONGO_URL", "mongodb://mongo:27017/MedBook"))["MedBook"]

    if len(argv) == 2:
        exportGeneSetGroup(db, argv[1])

        sys.exit(0)

    print __doc__

if __name__ == "__main__":
    main()
