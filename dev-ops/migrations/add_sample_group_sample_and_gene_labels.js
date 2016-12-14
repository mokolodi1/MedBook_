// This migration:
// - adds the sample_labels field to all sample groups
// - adds the feature_labels field to all sample groups

// keep track of which sample group we're updating while the script runs
var current = 1;
var total = db.sample_groups.find({}).count();

db.sample_groups.find({}).forEach(function (sampleGroup) {
  var sampleLabels = {};
  var featureLabelHash = {};
  var masterFeatureLabels;

  // loop through every data set that's there and for each data set:
  // - add the sample labels to the list
  // - add the feature labels to a giant hash map:
  //   first by data set id and then feature label
  sampleGroup.data_sets.forEach(function (sgDataSet) {
    // add the sample labels
    sgDataSet.sample_labels.forEach(function (sampleLabel) {
      sampleLabels[sampleLabel] = 1;
    });

    // add all the gene labels
    var dataSet = db.data_sets.findOne({ _id: sgDataSet.data_set_id });

    // set it up the first time
    if (!featureLabelHash[dataSet._id]) {
      featureLabelHash[dataSet._id] = {};
    }

    // push each of the feature labels onto the hash map
    dataSet.feature_labels.forEach(function (geneLabel) {
      featureLabelHash[dataSet._id][geneLabel] = 1;
    });

    // use the first data set's feature label list as the master list
    // to check below
    if (!masterFeatureLabels) {
      masterFeatureLabels = dataSet.feature_labels;
    }
  });

  // intersect all of the feature labels to figure out which sample labels
  // this sample group has
  var featureLabels = [];

  // loop through the feature labels
  masterFeatureLabels.forEach(function (featureLabel) {
    var inEachDataSet = true;

    // loop through the data sets
    Object.keys(featureLabelHash).forEach(function (dataSetId) {
      // if it's not in the data set, flip the flag
      if (!featureLabelHash[dataSetId][featureLabel]) {
        inEachDataSet = false;
      }
    });

    // push it to the master list if it's in every data set
    if (inEachDataSet) {
      featureLabels.push(featureLabel);
    }
  });

  // push the new data back into the object
  db.sample_groups.update({ _id: sampleGroup._id }, {
    $set: {
      sample_labels: Object.keys(sampleLabels),
      feature_labels: featureLabels,
    }
  });

  print("Updated (" + current + " / " + total + ")", sampleGroup.name);
  current++;
});
