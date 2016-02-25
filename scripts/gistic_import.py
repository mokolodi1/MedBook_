import csv
import re # regex
import json
import sys # for argv

# pip install bson
# pip install pymongo
from bson.objectid import ObjectId

# check the arguments
if len(sys.argv) != 3:
    print("""Example usage:
python3.4 gistic_import.py gistic_rect_file.tsv extend_object.json

where gistic_rect_file.tsv is the rectangular file containing the GISTIC data
and extend_object.json is the json object all the objects will extend.""")
    sys.exit(1)

# define the files to read from later
dataFilePath = sys.argv[1]
extendFilePath = sys.argv[2]

# text contains the sample label it may be surrounded by other text
def wrangleSampleLabel(text, studyLabel):
    if studyLabel == "prad_wcdt":
        # the "normal" return is: stuff + proIfPro + replicateNumber
        proIfPro = "";
        replicateNumber = "" # for after proIfPro (even if proIfPro is "")

        if re.search("pro", text, flags=re.IGNORECASE):
            proIfPro = "Pro";

        # try to match something like "DTB-000"
        matches = re.search(r"DTB-[0-9]{3}", text)
        if matches:
            # TODO: need examples
            if re.search(r"duplicate", text, flags=re.IGNORECASE):
                if proIfPro == "":
                    replicateNumber = "Dup"
                else:
                    replicateNumber = "2"

            # TODO: need examples
            baselineProWithNum = re.search(r"(baseline|progression)[0-9]", text, flags=re.IGNORECASE)
            if baselineProWithNum:
                # if we've already defined it, the behaviour is undefined
                if replicateNumber != "":
                    raise Exception("Undefined behaviour: duplicate and baseline/progression")

                replicateNumber = re.search(r"[0-9]", baselineProWithNum.group(0)).group(0)
                if proIfPro == "":
                    if replicateNumber == "2":
                        replicateNumber = "Dup"
                    else:
                        raise Exception("Unclear what to do with third BL duplicate")

            # now we have all the necessary components
            return matches.group(0) + proIfPro + replicateNumber

        # match samples like "DTB_097_Pro_T" (copy number data)
        # http://regexr.com/3c5p8
        # DTB_097_BL_T ==> DTB-097
        # DTB_097_BL2_T ==> DTB-097Dup
        # DTB_097_BL3_T ==> error thrown!
        # DTB_097_Pro_T ==> DTB-097Pro
        # DTB_097_Pro5_T ==> DTB-097Pro5
        matches = re.search(r"DTB_[0-9]{3}_(BL|Pro)([0-9]|)_T", text)
        if (matches):
            match = matches.group(0);
            numbers = re.search(r"[0-9]{3}", match).group(0)

            replicateMatches = re.search(r"(BL|Pro)([0-9])", match)
            if replicateMatches:
                replicatePart = replicateMatches.group(0)

                if proIfPro == "":
                    if replicatePart == "BL2":
                        replicateNumber = "Dup"
                    else:
                        raise Exception("Unclear what to do with third BL duplicate")
                else:
                    replicateNumber = re.search(r"[0-9]", replicatePart).group(0)

            return "DTB-" + numbers + proIfPro + replicateNumber

        # couldn't parse the text
        raise Exception("Couldn't parse sample label", text)

    # match TCGA sample labels (e.g. "TCGA-02-0055-01A-01R-1849-01")
    # https://wiki.nci.nih.gov/display/TCGA/TCGA+barcode
    # http://regexr.com/3c1b7
    # whole barcode: /TCGA-[A-Z0-9]{2}-[A-Z0-9]{1,4}-[0-9]{2}[A-Z]-[0-9]{2}[DGHRTWX]-[A-Z0-9]{4}-[0-9]{2}/g;
    #
    # NOTE: I removed the vial letter from this because if someone reads the
    # docs, having the vial letter is not necessary. This is not consistant
    # with what is currently loaded in expression2. When we move to
    # gene_expression this problem will be gone :)
    if studyLabel == "prad_tcga":
        matches = re.search(r"TCGA-[A-Z0-9]{2}-[A-Z0-9]{1,4}-[0-9]{2}")
        if (matches):
            return matches.group(0)

    # unknown studyLabel
    raise Exception("Unknown study label", studyLabel)

# read object to extend from file
extendJson = None # do I have to do this? (for scope)
with open(extendFilePath, "r") as myfile:
    extendJson = myfile.read().replace('\n', '')
# read into a json object
extendJson = json.loads(extendJson)
print("extending:", extendJson)

nonDataColumns = 3
with open(dataFilePath,"r") as inputFile:
    sampleLabels = [];

    reader = csv.reader(inputFile, delimiter='\t')
    with open("gene_annotation.mongoexport", "w") as outputFile:
        # loop through each line
        for line in reader:
            # parse the sample labels if it's the header line, otherwise write
            # objects to the file
            if len(sampleLabels) == 0:
                beforeWrangle = line[nonDataColumns:]
                for cell in beforeWrangle:
                    sampleLabels.append(wrangleSampleLabel(cell, "prad_wcdt"));

                # print out the wrangling results
                print("Wrangled sample labels:")
                for before, after in zip(beforeWrangle, sampleLabels):
                    print(before, "\t==>\t", after)
            else:
                # each cell will extend this json object
                geneJson = extendJson.copy()
                # wrangle "GENE|chr9"
                geneJson["gene_label"] = line[0].split("|")[0]

                # loop through each cell
                for cell, sampleLabel in zip(line[nonDataColumns:], sampleLabels):
                    cellJson = geneJson.copy()

                    cellJson["_id"] = str(ObjectId())
                    cellJson["sample_label"] = sampleLabel
                    cellJson["gistic_copy_number"] = int(cell)

                    outputFile.write(str(cellJson) + "\n")
