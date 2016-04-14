#! /usr/bin/env python

"""Export MedBook expression3 data into rectangular files.

Usage:
./expression3_export.py --sample_group_id [sample group _id]

Dependancies:
pymongo
"""

#./expression3_export.py --sample_label [sample label] --study_label [study label] [output]"""

import sys
import getopt
import pymongo

def export_with_id(db, sampleGroupId):
    sampleGroup = db["sample_groups"].find_one({ "_id": sampleGroupId })

    # NOTE: from this point on, don't reference sampleGroup["studies"]
    #       because we mutate it (only sort, for now)
    sampleGroupStudies = sampleGroup["studies"]

    # make sure sampleGroupStudies is sorted by sample_label
    sampleGroupStudies = sorted(sampleGroupStudies,
            key=lambda study: study["study_label"])

    # TODO: ??
    # # make sure the sample labels are sorted within each study
    # for index, value in enumerate(sampleGroupStudies):
    #     sampleGroupStudies[index]

    # TODO: make sure we're dealing with the same gene set
    # TODO: make sure there are no sample label collisions

    # print out the header line

    sys.stdout.write("Gene\t")

    for study in sampleGroupStudies:
        for sampleLabel in study["sample_labels"]:
            sys.stdout.write("\t" + sampleLabel)

    # print out the data

    studyLabels = [study["study_label"] for study in sampleGroupStudies]

    cursor = db["expression3"].find({ "study_label": { "$in": studyLabels } }).sort([
        ("gene_label", pymongo.ASCENDING),
        ("study_label", pymongo.ASCENDING)
    ])

    studies = db["studies"].find({"id": { "$in": studyLabels }}).sort([
        ("id", pymongo.ASCENDING)
    ])
    currentGene = ""
    studyIndex = len(studyLabels) # make sure we get a doc for each study
    for doc in cursor:
        # check to see if we're on a new gene
        if currentGene != doc["gene_label"]:
            # make sure we've seen all the studies
            if studyIndex != len(studyLabels):
                print "Missing expression3 doc for one or more studies"
                sys.exit(1)

            currentGene = doc["gene_label"]
            studyIndex = 0
            sys.stdout.write("\n" + currentGene + "\t")

        # write data for this study
        dataStrings = [str(data) for data in doc["rsem_quan_log2"]]
        sys.stdout.write("\t" + "\t".join(dataStrings))

        # increment the study index
        studyIndex += 1

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
        export_with_id(db, sampleGroupId)
        sys.exit(0)

    print __doc__

if __name__ == "__main__":
    main()
