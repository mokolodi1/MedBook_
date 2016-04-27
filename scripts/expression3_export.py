#! /usr/bin/env python

"""Export MedBook expression3 data into rectangular files.

Usage:
./expression3_export.py --sample_group_id [sample group _id]
./expression3_export.py --study_label [study label] --sample_label [sample label]

Dependancies:
pymongo
"""

import sys
import getopt
import pymongo

def export_from_object(db, sampleGroup):
    # NOTE: from this point on, don't reference sampleGroup["studies"]
    #       because we mutate it (only sort, for now)
    sampleGroupStudies = sampleGroup["studies"]

    # make sure sampleGroupStudies is sorted by study_label
    sampleGroupStudies = sorted(sampleGroupStudies,
            key=lambda study: study["study_label"])

    # TODO: ??
    # # make sure the sample labels are sorted within each study
    # for index, value in enumerate(sampleGroupStudies):
    #     sampleGroupStudies[index]
    studyLabels = [study["study_label"] for study in sampleGroupStudies]
    studies = list(db["studies"].find({"id": { "$in": studyLabels }}).sort([
        ("id", pymongo.ASCENDING)
    ]))

    # make sure we're dealing with the same gene set for each study
    # TODO
    if len(sampleGroupStudies) > 1:
        print "Need to make sure we're dealing with the same gene set for each study"
        sys.exit(1)
    # geneSet = studies[0]["gene_expression_genes"]

    # TODO: make sure there are no sample label collisions

    # print out the header line

    sys.stdout.write("Gene")

    for study in sampleGroupStudies:
        for sampleLabel in study["sample_labels"]:
            sys.stdout.write("\t" + sampleLabel)

    # print out the data (non-header line)

    # sort by gene_label and then study_label
    cursor = db["expression3"].find({ "study_label": { "$in": studyLabels } }).sort([
        ("gene_label", pymongo.ASCENDING),
        ("study_label", pymongo.ASCENDING)
    ])

    # make absolutely sure the order of the studies matches the order of the
    # studies in the sample group
    for i in range(len(studies)):
        if studies[i]["id"] != sampleGroupStudies[i]["study_label"]:
            print "Order of studies not equal to order of sample group studies"
            sys.exit(1)

    # actually write the stuff
    studyIndex = 0 # keep track of which study we're looking at
    firstStudyLabel = studies[0]["id"]
    for doc in cursor:
        # check to see if we're on a new gene
        if doc["study_label"] == firstStudyLabel:
            studyIndex = 0
            sys.stdout.write("\n" + doc["gene_label"] + "\t")

        # write data for this doc
        currentStudy = studies[studyIndex]
        dataStrings = []
        for sampleLabel in sampleGroupStudies[studyIndex]["sample_labels"]:
            index = currentStudy["gene_expression_index"][sampleLabel]
            dataStrings.append(str(doc["rsem_quan_log2"][index]))

        sys.stdout.write("\t".join(dataStrings))

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
        sampleGroup = db["sample_groups"].find_one({ "_id": sampleGroupId })
        export_from_object(db, sampleGroup)
        sys.exit(0)
    elif "--study_label" in argv and "--sample_label" in argv:
        studyIndex = argv.index("--study_label") + 1
        sampleIndex = argv.index("--sample_label") + 1

        # pretend we have a sample group
        export_from_object(db, {
            "studies": [
                {
                    "study_label": argv[studyIndex],
                    "sample_labels": [ argv[sampleIndex] ]
                }
            ]
        })

        sys.exit(0)

    print __doc__

if __name__ == "__main__":
    main()
