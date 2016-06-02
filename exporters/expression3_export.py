#! /usr/bin/env python

"""Export MedBook expression3 data into rectangular files.

Usage:
./expression3_export.py --sample_group_id [sample group _id]
./expression3_export.py --data_set_id [data set _id] --sample_label [sample label]

Dependancies:
pymongo
"""

import sys
import getopt
import pymongo

def export_from_object(db, sampleGroup):
    # NOTE: from this point on, don't reference sampleGroup["data_sets"]
    #       because we mutate it (only sort, for now)
    sampleGroupDataSets = sampleGroup["data_sets"]

    # make sure sampleGroupDataSets is sorted by data_set_id
    sampleGroupDataSets = sorted(sampleGroupDataSets,
            key=lambda dataSet: dataSet["data_set_id"])

    # TODO: ??
    # # make sure the sample labels are sorted within each study
    # for index, value in enumerate(sampleGroupDataSets):
    #     sampleGroupDataSets[index]
    dataSetIds = [study["data_set_id"] for study in sampleGroupDataSets]
    dataSets = list(db["data_sets"].find({"_id": { "$in": dataSetIds }}).sort([
        ("_id", pymongo.ASCENDING)
    ]))

    # make sure we're dealing with the same gene set for each data set
    geneSet = dataSets[0]["gene_expression_genes"]

    # if there is more than one data set, take the intersection one by one
    if len(dataSets) > 1:
        for dataSet in dataSet[1:]:
            geneSet = list(set(geneSet) & set(dataSet["gene_expression_genes"]))

        sys.stderr.write(str(geneSet));

    # TODO: make sure there are no sample label collisions

    # print out the header line
    sys.stdout.write("Gene")

    for study in sampleGroupDataSets:
        for sampleLabel in study["sample_labels"]:
            sys.stdout.write("\t" + sampleLabel)

    # print out the data (non-header line)

    # sort by gene_label and then data_set_id
    cursor = db["expression3"].find({
        "data_set_id": { "$in": dataSetIds },
        "gene_label": { "$in": geneSet }
    }).sort([
        ("gene_label", pymongo.ASCENDING),
        ("data_set_id", pymongo.ASCENDING)
    ])

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
            sys.stdout.write("\n" + doc["gene_label"] + "\t")

        # write data for this doc
        currentDataSet = dataSets[dataSetIndex]
        dataStrings = []
        for sampleLabel in sampleGroupDataSets[dataSetIndex]["sample_labels"]:
            index = int(currentDataSet["gene_expression_index"][sampleLabel])
            dataStrings.append(str(doc["rsem_quan_log2"][index]))

        sys.stdout.write("\t".join(dataStrings))

        dataSetIndex += 1

    # add a line return at the end
    sys.stdout.write("\n")

def main():
    argv = sys.argv

    # set up the database client
    db = pymongo.MongoClient()["MedBook"]

    # process options if --sample_group_id
    if "--sample_group_id" in argv:
        index = argv.index("--sample_group_id") + 1
        if index >= len(argv):
            print "Specify a sample group _id after the --sample_group_id option."
            sys.exit(1)

        sampleGroupId = argv[index]
        sampleGroup = db["sample_groups"].find_one({ "_id": sampleGroupId })
        export_from_object(db, sampleGroup)
        sys.exit(0)
    elif "--data_set_id" in argv and "--sample_label" in argv:
        dataSetIndex = argv.index("--data_set_id") + 1
        sampleIndex = argv.index("--sample_label") + 1

        # pretend we have a sample group
        export_from_object(db, {
            "data_sets": [
                {
                    "data_set_id": argv[dataSetIndex],
                    "sample_labels": [ argv[sampleIndex] ]
                }
            ]
        })

        sys.exit(0)

    print __doc__

if __name__ == "__main__":
    main()
