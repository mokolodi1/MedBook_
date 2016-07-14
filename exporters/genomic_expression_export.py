#! /usr/bin/env python

"""Export MedBook genomic_expression data into rectangular files.

Usage:
./genomic_expression_export.py --sample_group_id (sample group _id)
./genomic_expression_export.py --data_set_id (data set _id) [--sample_label (sample label)]

Use "--plc" to create a .plc file: http://www.broadinstitute.org/cancer/software/gsea/wiki/index.php/Data_formats#RES:_ExpRESsion_.28with_P_and_A_calls.29_file_format_.28.2A.res.29

Dependancies:
pymongo
"""

import sys
import getopt
import pymongo
import os

def export_from_object(db, sampleGroup, isPlc):
    # NOTE: from this point on, don't reference sampleGroup["data_sets"]
    #       because we mutate it (only sort, for now)
    sampleGroupDataSets = sampleGroup["data_sets"]

    # make sure sampleGroupDataSets is sorted by data_set_id
    sampleGroupDataSets = sorted(sampleGroupDataSets,
            key=lambda dataSet: dataSet["data_set_id"])

    dataSetIds = [study["data_set_id"] for study in sampleGroupDataSets]
    dataSets = list(db["data_sets"].find({"_id": { "$in": dataSetIds }}).sort([
        ("_id", pymongo.ASCENDING)
    ]))

    # TODO: make sure the sample labels are unique across data sets

    # make sure we're dealing with the same gene set for each data set
    geneSet = dataSets[0]["feature_labels"]

    # if there is more than one data set, take the intersection one by one
    if len(dataSets) > 1:
        for dataSet in dataSet[1:]:
            geneSet = list(set(geneSet) & set(dataSet["feature_labels"]))

    # TODO: make sure there are no sample label collisions

    # print out the header line
    sys.stdout.write("Gene")

    # if it's a .plc, put the extra two rows
    if isPlc:
        sys.stdout.write("\tNAME\tGWEIGHT");

    for study in sampleGroupDataSets:
        for sampleLabel in study["sample_labels"]:
            sys.stdout.write("\t" + sampleLabel)

    # print out the data (non-header line)

    # create an index so the sort doesn't fail
    sortBy = [
        ("feature_label", pymongo.ASCENDING),
        ("data_set_id", pymongo.ASCENDING)
    ]

    db["genomic_expression"].create_index(sortBy);

    # sort by feature_label and then data_set_id
    cursor = db["genomic_expression"].find({
        "data_set_id": { "$in": dataSetIds },
        "feature_label": { "$in": geneSet }
    }).sort(sortBy)

    # make absolutely sure the order of the dataSets matches the order of the
    # dataSets in the sample group
    for i in range(len(dataSets)):
        if dataSets[i]["_id"] != sampleGroupDataSets[i]["data_set_id"]:
            print "Order of data sets not equal to order of sample group data sets"
            sys.exit(1)

    # actually write the stuff
    dataSetIndex = 0 # keep track of which study we're looking at
    firstStudyLabel = dataSets[0]["_id"]
    for doc in cursor:
        # check to see if we're on a new gene
        if doc["data_set_id"] == firstStudyLabel:
            dataSetIndex = 0
            sys.stdout.write("\n" + doc["feature_label"] + "\t")

        # if it's a .plc, put the extra two rows
        if isPlc:
            sys.stdout.write("\t1\t");

        # write data for this doc
        currentDataSet = dataSets[dataSetIndex]
        dataStrings = []
        for sampleLabel in sampleGroupDataSets[dataSetIndex]["sample_labels"]:
            index = int(currentDataSet["sample_label_index"][sampleLabel])
            dataStrings.append(str(doc["values"][index]))

        sys.stdout.write("\t".join(dataStrings))

        dataSetIndex += 1

    # add a line return at the end
    sys.stdout.write("\n")

def main():
    argv = sys.argv

    # set up the database client
    db = pymongo.MongoClient(os.getenv("MONGO_URL"))["MedBook"]

    sampleGroup = {}

    if "--sample_group_id" in argv:
        index = argv.index("--sample_group_id") + 1
        if index >= len(argv):
            print "Specify a sample group _id after the --sample_group_id option."
            sys.exit(1)

        sampleGroupId = argv[index]
        sampleGroup = db["sample_groups"].find_one({ "_id": sampleGroupId })
    elif "--data_set_id" in argv:
        dataSetIndex = argv.index("--data_set_id") + 1

        # pretend we have a sample group
        sampleGroup = {
            "data_sets": [
                {
                    "data_set_id": argv[dataSetIndex],
                }
            ]
        };

        if "--sample_label" in argv:
            sampleIndex = argv.index("--sample_label") + 1
            sampleGroup["data_sets"][0]["sample_labels"] = [ argv[sampleIndex] ]
        else:
            dataSet = db["data_sets"].find_one({ "_id": argv[dataSetIndex] })
            sampleGroup["data_sets"][0]["sample_labels"] = dataSet["sample_labels"]
    else:
        print("invalid arguments given to exporter");
        sys.exit(1);

    export_from_object(db, sampleGroup, "--plc" in argv)

    sys.exit(0)

if __name__ == "__main__":
    main()
