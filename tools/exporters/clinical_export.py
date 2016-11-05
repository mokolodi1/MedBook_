#! /usr/bin/env python

"""Export MedBook clinical data into rectangular files.  all fields from the form will be exported
   Export metadata files for cbio import

Usage:
./clinical_export.py --sample_group_id (sample_group_id) --form_id (form_id)  --work-dir (directory)
db.records.find({"associated_object.mongo_id":"6QpxSMZymmL28Ge8k"},{Age:1,Race:1,_id:0,"Patient ID":1})

TODO:
Use the "--uq-sample-labels" option to exclude the study_label prefix from the sample names. Ex: a sample will be called "DTB-001" instead of "prad_wcdt/DTB-001" if there are no sample name collisions. If there are sample name collisions this option is ignored.

Dependancies:
pymongo
"""

import sys
import getopt
import pymongo
import os

def export_from_object(db, sampleGroup, form_id, work_dir, isPlc):
    out_clin = open(work_dir+"/data_clinical.txt","w")
    sampleGroupDataSets = sampleGroup["data_sets"]
    #print "sampleGroupDataSets", sampleGroupDataSets
    form = db["forms"].find_one({ "_id": form_id })
    field_list = form[u'fields']
    sample_label_field = form[u'sample_label_field']

    #line 1 - field names
    out_clin.write("#%s" % "Patient_ID" ),
    out_clin.write("\t%s" % "Sample_ID" ),
    for field in field_list:
	if field[u'name'] != sample_label_field:
		out_clin.write("\t%s" % field[u'name'] ),
    out_clin.write("\n")
    #line 2 - field descriptions
    out_clin.write("#%s" % "Patient_ID" ),
    out_clin.write("\t%s" % "Sample_ID" ),
    for field in field_list:
	if field[u'name'] != sample_label_field:
		out_clin.write("\t%s" % field[u'name'] ),
    out_clin.write("\n")

    #line 3 - field types
    out_clin.write("#%s" % "STRING" ),
    out_clin.write("\t%s" % "STRING" ),
    for field in field_list:
	if field[u'name'] != sample_label_field:
		out_clin.write("\t%s" % field[u'value_type'].toUpperCase() ),
    out_clin.write("\n")
    #line 4 - priority
    out_clin.write("#%s" % "1" ),
    out_clin.write("\t%s" % "1" ),
    for field in field_list:
	if field[u'name'] != sample_label_field:
		out_clin.write("\t%s" % "1" ),
    out_clin.write("\n")
    #line 5 - mysql field names
    out_clin.write("%s" % "PATIENT_ID" ),
    out_clin.write("\t%s" % "SAMPLE_ID" ),
    for field in field_list:
	if field[u'name'] != sample_label_field:
		out_clin.write("\t%s" % field[u'name'].upper().replace(" ","_").replace("-","_").replace("?","_").replace(",","_")),
    out_clin.write("\n")
    # db.records.find({"associated_object.mongo_id":"6QpxSMZymmL28Ge8k"},{Age:1,Race:1,_id:0,"Patient ID":1})
    record_list = db["records"].find({ "associated_object.mongo_id": form_id })

    for record in record_list:

        pid = record["Patient ID"]
	name_arr = []
	if '/' in pid:
		name_arr = pid.split('/')
		pid = name_arr[1]

        out_clin.write("%s\t%s" % (pid, pid))
        for field in field_list:
		name = field[u'name']
		if name != sample_label_field:
			try:
				out_clin.write("\t%s" % record[name]),
			except:
				out_clin.write("\t%s" % "NA"),

        out_clin.write("\n")
    out_clin.close()

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
        print("invalid arguments given to exporter missing sample_group or data_set");
        sys.exit(1);
    if "--form_id" in argv:
        formIndex = argv.index("--form_id") + 1
        form_id = argv[formIndex]
    else:
        print("--form_id missing");
        sys.exit(1);
    if "--work-dir" in argv:
        workIndex = argv.index("--work-dir") + 1
        work_dir = argv[workIndex]
        if not os.path.exists(work_dir):
        	os.makedirs(work_dir)
    else:
     	print("--work-dir missing");
    	sys.exit(1);

    export_from_object(db, sampleGroup, form_id, work_dir, "--plc" in argv)

    sys.exit(0)

if __name__ == "__main__":
    main()
