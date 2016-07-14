/*
* Maintains relationship between studies and genomic_expression
* 1. Make sure there's no elements in genomicExpDoc.values not
*    associated with any sample in the dataSet
* 2. Make sure dataSet.sample_label_index is looking good
* 3. If dataSet.feature_labels isn't defined, calculate it from
*    documents in genomic_expression
*/
// TODO: add indexes to make this faster
MedBook.referentialIntegrity.DataSets_GenomicExpression =
    function (dataSetQuery) {
  console.log("starting referential integrity maintenance" +
      " (data_sets ==> genomic_expression)");

  if (!dataSetQuery) { // default to all studies
    dataSetQuery = {};
  }

  DataSets.find(dataSetQuery).forEach(function (dataSet) {
    var data_set_id = dataSet._id;
    console.log("data set _id / name:", dataSet._id, dataSet.name);

    // remove GenomicExpression documents that don't have any data
    GenomicExpression.remove({
      data_set_id: data_set_id,
      values: { $size:  0 }
    });

    // remove genomicExpDoc.values array values not associated with
    // a sample in dataSet.sample_labels

    var sampleArray = []; // default if dataSet.sample_labels undefined
    if (dataSet.sample_labels) {
      sampleArray = dataSet.sample_labels;
    }
    sampleLength = sampleArray.length;

    // "To use the $slice modifier, it must appear with the $each modifier.
    // You can pass an empty array [] to the $each modifier such that only
    // the $slice modifier has an effect."
    // - https://docs.mongodb.org/manual/reference/operator/update/slice/
    GenomicExpression.update({
      data_set_id: data_set_id,
      $where: function () { return this.values.length !== sampleLength; },
    }, {
      $push: {
        values: {
          $each: [],
          $slice: sampleLength
        }
      }
    }, { multi: true });

    // remove GenomicExpression docs not associated with a valid feature
    GenomicExpression.remove({
      data_set_id: data_set_id,
      feature_label: { $nin: dataSet.feature_labels },
    });



    // regenerate dataSet.sample_label_index from dataSet.sample_labels and
    // compare it to the current index

    var currentIndex = dataSet.sample_label_index;
    if (!currentIndex) {
      currentIndex = {};
    }
    var correctIndex = {};

    for (var i = 0; i < sampleLength; i++) {
      correctIndex[sampleArray[i]] = i;
    }
    if (!_.isEqual(correctIndex, currentIndex)) {
      console.log("There was a discrepancy between the sample_label_index " +
          "in " + data_set_id + " and the 'correct' index.");
      console.log("currentIndex !== correctIndex (bad!!!)");
      // console.log("dataSet.sample_labels:", sampleArray);
      // console.log("currentIndex:", currentIndex);
      // console.log("correctIndex:", correctIndex);

      console.log("setting to correctIndex...");
      DataSets.update(data_set_id, {
        $set: {
          sample_label_index: correctIndex
        }
      });
    }



    // make sure feature_labels is set

    if (!dataSet.feature_labels) {
      // feature_labels has never been set, so we will calculate it from
      // gene_expression data if that is present

      if (GenomicExpression.findOne({ data_set_id: data_set_id })) {
        // there's existing data, so let's make sure we match that

        // get a sorted list of all of the distinct `feature_label`s in
        // GenomicExpression for this dataSet
        var existingDistinctFeatures = GenomicExpression.aggregate([
          {$match: {data_set_id: data_set_id}},
          {$group: {_id: ":)", "genes": {$addToSet: "$feature_label"}}}
        ])[0].genes.sort();

        // NOTE: node hangs if we try to do this update through the non-raw
        // collection because the array is so large (20,000+ elements)
        DataSets.rawCollection().update({_id: data_set_id}, {
          $set: { feature_labels: existingDistinctFeatures }
        }, function (error, result) {
          if (error) {
            console.log(data_set_id,
                "feature_labels update error:", error);
          }
        });

        console.log(data_set_id,
            "feature_labels calculated from existing GenomicExpression data");
      }
    }
  });

  console.log("done with referential integrity maintenance");
};
