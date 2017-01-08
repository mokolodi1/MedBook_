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

def export_from_object(db, sampleGroup, form_id, patient_form_id, work_dir, isPlc):
    sampleGroupDataSets = sampleGroup["data_sets"]
    dataset_name = "generic name"
    desc = "generic description"
    data_set_id = ""
    dataset_label = ""
    dataset_name = sampleGroup["name"]
    for d in sampleGroupDataSets:
        data_set_id = d[u'data_set_id']
        # assume dataset has only one study **FIX**
        for s in d[u'sample_labels']:
            dataset_label = s.split('/')[0]
    # **FIX** assume dataset_label is composed of cancer_type "_" "name"
    cancer_type = dataset_label.split('_')[0]
    data_set = db["data_sets"].find_one({ "_id": data_set_id })
    desc = data_set[u'description']
    collaboration_list = data_set[u'collaborations']
    collabs = ""
    for collab in collaboration_list:
        collabs = collabs+collab.encode('ascii','ignore')+';'
    form = db["forms"].find_one({ "_id": form_id })
    try:
	    field_list = form[u'fields']
    except:
	    print "Form", form_id, "not found"
    sample_label_field = form[u'sample_label_field']
    print "field_list", field_list, sample_label_field
    out_study = open("./meta_study.txt","w")
    out_study.write("type_of_cancer: %s\n" % cancer_type);
    out_study.write("cancer_study_identifier:  %s\n" % dataset_label);
    out_study.write("name: %s\n" % dataset_name);
    out_study.write("description: %s\n" % desc);
    out_study.write("citation: unpublished\n");
    out_study.write("groups: %s\n" % collabs);
    out_study.write("short_name: %s\n" % dataset_label);

    # db.records.find({"associated_object.mongo_id":"6QpxSMZymmL28Ge8k"},{Age:1,Race:1,_id:0,"Patient ID":1})
    record_list = db["records"].find({ "associated_object.mongo_id": form_id })
    sample_count = 0
    for record in record_list:
        sample_count += 1
    os.mkdir("./case_lists")
    out_case_list = open("./case_lists/cases_all.txt","w");
    out_case_list.write("cancer_study_identifier: %s\n"% dataset_label)
    out_case_list.write("stable_id: %s_all\n"% dataset_label)
    out_case_list.write("case_list_category: all_cases_in_study\n");
    out_case_list.write("case_list_name: All Tumors\n");
    out_case_list.write("case_list_description: All tumor samples (%d samples)\n"% sample_count);
    out_case_list.write("case_list_ids: ");
    record_list = db["records"].find({ "associated_object.mongo_id": form_id })
    for record in record_list:
        sid = record[sample_label_field].split('/')
        out_case_list.write("%s\t"% sid[1]);
    out_case_list.write("\n");
    out_case_list.close()

    out_meta_clin = open("./meta_sample.txt","w")
    out_meta_clin.write("cancer_study_identifier: %s\n"% dataset_label)
    out_meta_clin.write("genetic_alteration_type: CLINICAL\n")
    out_meta_clin.write("datatype: SAMPLE_ATTRIBUTES\n")
    out_meta_clin.write("data_filename: data_sample.txt\n")
    if patient_form_id is not None:
        out_meta_clin_patient = open("./meta_patient.txt","w")
        out_meta_clin_patient.write("cancer_study_identifier: %s\n"% dataset_label)
        out_meta_clin_patient.write("genetic_alteration_type: CLINICAL\n")
        out_meta_clin_patient.write("datatype: PATIENT_ATTRIBUTES\n")
        out_meta_clin_patient.write("data_filename: data_patient.txt\n")
        out_meta_clin_patient.close()

    out_meta_exp = open("./meta_expression.txt","w")
    out_meta_exp.write("profile_name: WCDT exp\n")
    out_meta_exp.write("profile_description: WCDT exp\n")
    out_meta_exp.write("show_profile_in_analysis_tab: true\n")
    out_meta_exp.write("stable_id: rna_seq_v2_mrna_median_Zscores\n")
    out_meta_exp.write("cancer_study_identifier: %s\n"% dataset_label)
    out_meta_exp.write("genetic_alteration_type: MRNA_EXPRESSION\n")
    out_meta_exp.write("datatype: Z-SCORE\n")
    out_meta_exp.write("data_filename: data_expression.txt\n")
    out_clin = open("./data_sample.txt","w")

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
    if patient_form_id is not None:
        out_clin_patient = open("./data_patient.txt","w")
        form = db["forms"].find_one({ "_id": patient_form_id })
        try:
    	    field_list = form[u'fields']
        except:
    	    print "Form", form_id, "not found"
        sample_label_field = form[u'sample_label_field']
        print "field_list", field_list, sample_label_field

        #line 1 - field names
        out_clin_patient.write("#%s" % field_list[0][u'name']),
        #out_clin_patient.write("\t%s" % "Sample_ID" ),
        for field in field_list[1:]:
        	#if field[u'name'] != sample_label_field:
    		out_clin_patient.write("\t%s" % field[u'name'] ),
        out_clin_patient.write("\n")
        #line 2 - field descriptions
        out_clin_patient.write("#%s" % field_list[0][u'name']),
        #out_clin_patient.write("\t%s" % "Sample_ID" ),
        for field in field_list[1:]:
        	#if field[u'name'] != sample_label_field:
    		out_clin_patient.write("\t%s" % field[u'name'] ),
        out_clin_patient.write("\n")

        #line 3 - field types
        out_clin_patient.write("#%s" % "STRING" ),
        #out_clin_patient.write("\t%s" % "STRING" ),
        for field in field_list[1:]:
            #if field[u'name'] != sample_label_field:
            ftype = str(field[u'value_type'])
            out_clin_patient.write("\t%s" % ftype.upper() ),
        out_clin_patient.write("\n")
        #line 4 - priority
        out_clin_patient.write("#%s" % "1" ),
        #out_clin_patient.write("\t%s" % "1" ),
        for field in field_list[1:]:
        	#if field[u'name'] != sample_label_field:
        	out_clin_patient.write("\t%s" % "1" ),
        out_clin_patient.write("\n")
        #line 5 - mysql field names
        out_clin_patient.write("%s" % "PATIENT_ID" ),
        #out_clin_patient.write("\t%s" % "SAMPLE_ID" ),
        for field in field_list[1:]:
        	#if field[u'name'] != sample_label_field:
    		out_clin_patient.write("\t%s" % field[u'name'].upper().replace(" ","_").replace("-","_").replace("?","_").replace(",","_")),
        out_clin_patient.write("\n")
        # db.records.find({"associated_object.mongo_id":"6QpxSMZymmL28Ge8k"},{Age:1,Race:1,_id:0,"Patient ID":1})
        record_list = db["records"].find({ "associated_object.mongo_id": patient_form_id })

        for record in record_list:
            print "#record", record
            print "#form", form
            #pid = record["Patient_ID"]
            pid = form[u"sample_label_field"]
            print "pid", pid
            sid = record[sample_label_field]
            name_arr = []
            if '/' in sid:
        		name_arr = sid.split('/')
        		sid = name_arr[1]

            out_clin_patient.write("%s" % (sid))
            for field in field_list[1:]:
                name = field[u'name']
                if field[u'name'] == sample_label_field:
                    out_clin_patient.write("\t%s" % sid),
                else:
                    try:
                        out_clin_patient.write("\t%s" % record[name]),
                    except:
        				out_clin_patient.write("\t%s" % "NA"),

            out_clin_patient.write("\n")
        out_clin_patient.close()
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
    if "--patient_form_id" in argv:
        formIndex = argv.index("--patient_form_id") + 1
        patient_form_id = argv[formIndex]
    else:
        patient_form_id = None
    if "--work-dir" in argv:
        workIndex = argv.index("--work-dir") + 1
        work_dir = argv[workIndex]
        if not os.path.exists(work_dir):
        	os.makedirs(work_dir)
    else:
     	print("--work-dir missing");
    	sys.exit(1);

    export_from_object(db, sampleGroup, form_id, patient_form_id, work_dir, "--plc" in argv)

    sys.exit(0)

if __name__ == "__main__":
    main()
