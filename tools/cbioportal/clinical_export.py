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
    sampleGroupDataSets = sampleGroup["data_sets"]
    dataset_name = "generic name"
    desc = "generic description"
    data_set_id = ""
    sample_label = ""
    for d in sampleGroupDataSets:
        dataset_name = d[u'data_set_name']
        data_set_id = d[u'data_set_id']
        # assume dataset has only one study **FIX**
        for s in d[u'sample_labels']:
            sample_label = s.split('/')[0]
    # **FIX** assume sample_label is composed of cancer_type "_" "name"
    cancer_type = sample_label.split('_')[0]
    data_set = db["data_sets"].find_one({ "_id": data_set_id })
    desc = data_set[u'description']
    collaboration_list = data_set[u'collaborations']
    collabs = ""
    for collab in collaboration_list:
        collabs = collabs+collab.encode('ascii','ignore')+';'
    out_study = open("./meta_study.txt","w")
    out_study.write("type_of_cancer: %s\n" % cancer_type);
    out_study.write("cancer_study_identifier:  %s\n" % sample_label);
    out_study.write("name: %s\n" % dataset_name);
    out_study.write("description: %s\n" % desc);
    out_study.write("citation: unpublished\n");
    out_study.write("groups: %s\n" % collabs);
    out_study.write("short_name: %s\n" % sample_label);

    out_meta_clin = open("./meta_sample.txt","w")
    out_meta_clin.write("cancer_study_identifier: %s\n"% sample_label)
    out_meta_clin.write("genetic_alteration_type: CLINICAL\n")
    out_meta_clin.write("datatype: SAMPLE_ATTRIBUTES\n")
    out_meta_clin.write("data_filename: data_sample.txt\n")

    out_meta_exp = open("./meta_expression.txt","w")
    out_meta_exp.write("profile_name: WCDT exp\n")
    out_meta_exp.write("profile_description: WCDT exp\n")
    out_meta_exp.write("show_profile_in_analysis_tab: true\n")
    out_meta_exp.write("stable_id: rna_seq_v2_mrna_median_Zscores\n")
    out_meta_exp.write("cancer_study_identifier: %s\n"% sample_label)
    out_meta_exp.write("genetic_alteration_type: MRNA_EXPRESSION\n")
    out_meta_exp.write("datatype: Z-SCORE\n")
    out_meta_exp.write("data_filename: data_expression.txt\n")
    out_clin = open("./data_sample.txt","w")
    form = db["forms"].find_one({ "_id": form_id })
    try:
	    field_list = form[u'fields']
    except:
	    print "Form", form_id, "not found"
    sample_label_field = form[u'sample_label_field']
    print "field_list", field_list, sample_label_field

    #line 1 - field names
    out_clin.write("#%s" % field_list[0][u'name']),
    #out_clin.write("\t%s" % "Sample_ID" ),
    for field in field_list[1:]:
    	#if field[u'name'] != sample_label_field:
		out_clin.write("\t%s" % field[u'name'] ),
    out_clin.write("\n")
    #line 2 - field descriptions
    out_clin.write("#%s" % field_list[0][u'name']),
    #out_clin.write("\t%s" % "Sample_ID" ),
    for field in field_list[1:]:
    	#if field[u'name'] != sample_label_field:
		out_clin.write("\t%s" % field[u'name'] ),
    out_clin.write("\n")

    #line 3 - field types
    out_clin.write("#%s" % "STRING" ),
    #out_clin.write("\t%s" % "STRING" ),
    for field in field_list[1:]:
        #if field[u'name'] != sample_label_field:
        ftype = str(field[u'value_type'])
        out_clin.write("\t%s" % ftype.upper() ),
    out_clin.write("\n")
    #line 4 - priority
    out_clin.write("#%s" % "1" ),
    #out_clin.write("\t%s" % "1" ),
    for field in field_list[1:]:
    	#if field[u'name'] != sample_label_field:
    	out_clin.write("\t%s" % "1" ),
    out_clin.write("\n")
    #line 5 - mysql field names
    out_clin.write("%s" % "PATIENT_ID" ),
    #out_clin.write("\t%s" % "SAMPLE_ID" ),
    for field in field_list[1:]:
    	#if field[u'name'] != sample_label_field:
		out_clin.write("\t%s" % field[u'name'].upper().replace(" ","_").replace("-","_").replace("?","_").replace(",","_")),
    out_clin.write("\n")
    # db.records.find({"associated_object.mongo_id":"6QpxSMZymmL28Ge8k"},{Age:1,Race:1,_id:0,"Patient ID":1})
    record_list = db["records"].find({ "associated_object.mongo_id": form_id })

    for record in record_list:
        pid = record["Patient_ID"]
        sid = record[sample_label_field]
    	name_arr = []
    	if '/' in sid:
    		name_arr = sid.split('/')
    		sid = name_arr[1]

        out_clin.write("%s" % (pid))
        for field in field_list[1:]:
            name = field[u'name']
            if field[u'name'] == sample_label_field:
                out_clin.write("\t%s" % sid),
            else:
                try:
                    out_clin.write("\t%s" % record[name]),
                except:
    				out_clin.write("\t%s" % "NA"),

        out_clin.write("\n")
    out_study.close()
    out_meta_clin.close()
    out_meta_exp.close()
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
