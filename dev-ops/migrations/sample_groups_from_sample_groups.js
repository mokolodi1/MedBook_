print("Starting sample_groups_from_sample_groups migration");


// clone sample groups into backup collection
if (!db.pre_sg_from_sgs_sample_groups.findOne()) {
  db.sample_groups.renameCollection("pre_sg_from_sgs_sample_groups");

  print("renamed old collections to pre_migration");
}

db.sample_groups.remove({});
db.pre_sg_from_sgs_sample_groups.copyTo("sample_groups");

print("restored pre-migration collections");


// keep track of which sample group we're updating while the script runs
var current = 1;
var total = db.sample_groups.find({}).count();

db.sample_groups.find({}).forEach(function (sampleGroup) {
  var filteredSampleSources = [];

  for (var i = 0; i < sampleGroup.data_sets.length; i++) {
    var sgDataSet = sampleGroup.data_sets[i];

    // generate the filtered source from the old sgDataSet
    var source = JSON.parse(JSON.stringify(sgDataSet));

    // rename a couple attributes
    source.mongo_id = source.data_set_id;
    source.name = source.data_set_name;
    delete source.data_set_id;
    delete source.data_set_name;

    source.collection_name = "DataSets";

    // add the source to the sources list
    filteredSampleSources.push(source);

    // remove the extra attributes from the old sgDataSet
    delete sgDataSet.unfiltered_sample_count;
    delete sgDataSet.filters;
  }

  // put the generated info back into the sample group
  db.sample_groups.update({ _id: sampleGroup._id }, {
    $set: {
      filtered_sample_sources: filteredSampleSources,

      // NOTE: modified in-place
      data_sets: sampleGroup.data_sets,
    }
  });

  print("Updated (" + current + " / " + total + ")", sampleGroup.name);
  current++;
});
