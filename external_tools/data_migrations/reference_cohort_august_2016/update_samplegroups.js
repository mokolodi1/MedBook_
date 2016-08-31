
// For Expression & Variance Filters 
// Rename the CKCC reference cohort
// Add me to its sample groups
// Rename it in its sample groups

var new_dataset_name = "CKCC Reference Cohort (pre-filtered)" ;
var dataset_id = // "DATASET ID REMOVED" ;
var add_user = // "COLLABORATION STRING REMOVED" ;
// Rename the dataset
db.data_sets.update({_id: dataset_id}, {$set: {name: new_dataset_name}})
// For each of its sample groups
db.sample_groups.find({"data_sets.data_set_id" : dataset_id}).forEach(function (sg) {
  print(sg._id);
  // Add me to its collaborations
  db.sample_groups.update(
  {"_id" : sg._id},
  {
    $push: {
      "collaborations": add_user,
    }
  });
  // Then update the dataset name
  sg.data_sets.forEach(function(ds){
    if(ds.data_set_id === dataset_id){
      ds.data_set_name = new_dataset_name ;
    }
  });
  // And write that update to the database
  db.sample_groups.update(
  {
    "_id" : sg._id,
  },
  {$set:
    {data_sets : sg.data_sets}
  }
  );
});
