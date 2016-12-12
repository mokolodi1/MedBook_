// This migration:
// - adds the sample_labels field to all sample groups
// - adds the feature_labels field to all sample groups

var current = 1;
var total = db.sample_groups.find({}).count();

db.sample_groups.find({}).forEach(function (sampleGroup) {
  var sampleLabels = {};
  var featureLabels = {};

  // loop through every data set that's there...
  sampleGroup.data_sets.forEach(function (sgDataSet) {
    // add the sample labels
    sgDataSet.sample_labels.forEach(function (sampleLabel) {
      sampleLabels[sampleLabel] = 1;
    });

    // add all the gene labels
    var dataSet = db.data_sets.findOne({ _id: sgDataSet.data_set_id });

    dataSet.feature_labels.forEach(function (geneLabel) {
      featureLabels[geneLabel] = 1;
    });
  });

  // push the new data back into the object
  db.sample_groups.update({ _id: sampleGroup._id }, {
    $set: {
      sample_labels: Object.keys(sampleLabels),
      feature_labels: Object.keys(featureLabels),
    }
  });

  print("Updated (" + current + " / " + total + ")", sampleGroup.name);
  current++;
});
