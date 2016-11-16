#! /usr/bin/env python

"""Usage:
./import_gene_set.py filePath name description geneLabelField security
    [--fieldDefinitions "header 1" "String" "header 2" "Number"]
    [--fieldTypesOnly "String" "Number"]
    [--metadata={"attribute_name":1}]

The security field can either be an object
(ex. '{collection_name:"Jobs",mongo_id:"1234abcd"}') or an
array of strings ["WCDT","teo@medbook.io"].

NOTE: object fields must be surrounded by an extra pair
of single quotes because otherwise node's spawn command
tries to break JSON objects into multiple arguments.

"--fieldDefinitions" and "--fieldTypesOnly" are mutually
exclusive, and all arguments after these arguments will be
interpreted as field definitions.

If "--fieldTypesOnly" is provided, the first row will be
used as field names, with each provided value type
matching up with one field.

If "--fieldDefinitions" is provided, the field
definitions will be used instead of the first row of the
file. Column definitions are a list of header name and type
tuples, where each member of the tuple is a different
argument. (Ex: for a three field file there will be six
arguments.)

It is an error if the provided number of fields does not
match the number of fields in the file.

Dependancies:
pymongo
json
bson
"""

import sys
import pymongo
import os
import json
from bson.objectid import ObjectId

def importGeneSet(filePath, geneSet, securityString, fields, metadata):
    # set up the database client
    db = pymongo.MongoClient(os.getenv("MONGO_URL", \
            "mongodb://mongo:27017/MedBook"))["MedBook"]

    # create the gene set id here to be inserted down below
    geneSetId = str(ObjectId())
    print geneSetId

    # build up an array of records and then insert them all at once
    records = []

    with open(filePath) as f:
        # whether we're on the first line
        thisLineColumns = not fields[0]["name"]

        for line in f:
            cells = line.split("\t")

            # make sure it's the right size
            assert len(cells) == len(fields)

            # if it's a header line, parse the field names
            if thisLineColumns:
                thisLineColumns = False;

                # TODO: parse the header row into columns

                raise Exception("not implemented")
                continue

            # parse a data line
            record = {
                "associated_object": {
                    "collection_name": "GeneSets",
                    "mongo_id": geneSetId
                }
            }

            # attach each of the column values to the
            # record with the correct attributes
            for i in range(len(fields)):
                field = fields[i]
                cell = cells[i]

                # placeholder value to achieve scope
                value = None

                if field["value_type"] == "Number":
                    if "." in cell:
                        value = float(cell)
                    else:
                        value = int(cell)
                elif field["value_type"] == "String":
                    value = cell
                else:
                    print field
                    raise Exception("invalid value type", field["value_type"])

                record[field["name"]] = value

            # add the record to be inserted later
            records.append(record)

    # insert the records for the gene set
    db.records.insert_many(records)

    # set up security for the new gene set
    security = json.loads(securityString[1:-1])

    securityAttribute = "associated_object"
    if type(security) is list:
        securityAttribute = "collaborations"

    geneSet[securityAttribute] = security

    # if metadata is specified, attach that too
    if metadata:
        geneSet["metadata"] = metadata

    # add a couple more fields
    geneSet["_id"] = geneSetId
    geneSet["fields"] = fields

    # create the gene set
    db.gene_sets.insert(geneSet)

def main():
    argv = sys.argv

    # need at least 8 arguments to be valid
    if len(argv) > 8:
        fields = []
        metadata = {}

        # parse the given information into fields
        if "--fieldDefinitions" in argv:
            startIndex = argv.index("--fieldDefinitions") + 1

            fieldInfo = argv[startIndex:]
            for i in range(len(fieldInfo) / 2):
                print i
                fields.append({
                    "name": fieldInfo[i * 2],
                    "value_type": fieldInfo[i * 2 + 1]
                })
                print fieldInfo[i * 2], fieldInfo[i * 2 + 1]
        else:
            # TODO
            sys.exit(1)

        geneSet = {
            "name": argv[2],
            "description": argv[3],
            "gene_label_field": argv[4],
        }

        print argv
        print fields

        importGeneSet(argv[1], geneSet, argv[5], fields, metadata)

        sys.exit(0)

    print __doc__

if __name__ == "__main__":
    main()
