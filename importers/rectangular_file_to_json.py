#! /usr/bin/env python

"""Convert a rectangular file to a JSON file ready for mongoimport

Usage:
./rectangular_file_to_json.py data.tab [data_set_id] > output.mongoexport
"""

# pip install bson
from bson.objectid import ObjectId
import json
import sys

def main():
    argv = sys.argv

    if len(argv) == 3:
        firstLine = True
        sampleLabels = []
        dataSetId = argv[2]

        with open(argv[1]) as f:
            for line in f:
                cells = line.split("\t");

                if firstLine:
                    sampleLabels = cells[1:]
                    firstLine = False
                else:
                    expression3Doc = {}

                    expression3Doc["_id"] = str(ObjectId())
                    expression3Doc["data_set_id"] = dataSetId
                    expression3Doc["gene_label"] = cells[0]
                    expression3Doc["rsem_quan_log2"] = [float(num) for num in cells[1:]]

                    print(str(expression3Doc))

        # magical incantation to import into mongodb
        # batchSize makes sure each bulk operation is smaller than 16mb
        sys.stderr.write("Use this command to imoprt into mongo:\n")
        sys.stderr.write("mongoimport --db MedBook --collection expression3 --file OUTPUTFILE.mongoexport --batchSize 50\n")

        sys.stderr.write("\nUse this command to get the sample labels:\n")
        sys.stderr.write("./get_data_set_sample_labels data.tab | pbcopy\n")

        sys.stderr.write("\nUse this command to get the gene_expression_genes:\n")
        sys.stderr.write("./get_data_set_genes data.tab | pbcopy\n")

        sys.exit(0)

    print __doc__

if __name__ == "__main__":
    main()
