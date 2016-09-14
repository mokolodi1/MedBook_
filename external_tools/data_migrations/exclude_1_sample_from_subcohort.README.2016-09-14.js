// Sept 14 2016
// Code for batch making a sample group that is :
// A subcohort filtered by form values + 1 sample excluded from that
// Check the database for the form values filter object -- 
// you can just paste it in.
// Add all samples you want to exclude (1 excluded per samplegroup)
// to exclude_samples . 
// Basically anything in the following code with $WHATEVER needs to be replaced
// by the desired value.
// Then, in chrome, make this a snippet and run it in the console with a medbook
// page open.

var exclude_samples = [
"$SAMPLE1",	
"$SAMPLE2"
]

function makeObj(samplename) {
    console.log(samplename);
    scoped_samplename = "$STUDYTAG/" + samplename;


  return {
  "name" : "- " + samplename + " excluded from $COHORT",
	  "version" : 1,
  	"collaborations" : [
	  	"$EMAIL1",
		  "$EMAIL2"
  	],
	  "data_sets" : [
		  {
			  "data_set_id" : "$COHORTID",
  			"filters" : [
	  			{
		  			"type" : "form_values",
			  		"options" : {
				  		"form_id" : "$FORMID",
					  	"mongo_query" : "{\"$and\":[{\"Dataset\":\"$DATASET\"},{\"Disease\":\"$DISEASE\"}]}"
  					}
	  			},
		  		{
			  		"type" : "exclude_sample_list",
				  	"options" : {
					  	"sample_labels" : [
						  	scoped_samplename
  						],
	  					"sample_count" : 1
		  			}
			  	}
  			],
  		}]
  };
}


  for( item of exclude_samples){
     newobj = makeObj(item);
    Meteor.call("createSampleGroup", newobj, (e,r) => {
      if(e){console.log("ERROR ",e);}
      else{console.log("RAN ",r);} 
    });
  }
