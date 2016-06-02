/*
* Maintains relationship between studies and expression3
* 1. Make sure there's no elements in expression3Doc.rsem_quan_log2 not
*    associated with any sample in the dataSet
* 2. Make sure dataSet.gene_expression_index is looking good
* 3. If dataSet.gene_expression_genes isn't defined, calculate it from
*    documents in expression3
*/
MedBook.referentialIntegrity.dataSets_expression3 = function (dataSetQuery) {
  console.log("starting referential integrity maintenance" +
      " (data sets ==> expression3)");

  if (!dataSetQuery) { // default to all studies
    dataSetQuery = {};
  }

  DataSets.find(dataSetQuery).forEach(function (dataSet) {
    var data_set_id = dataSet._id;
    console.log("data set _id / name:", dataSet._id, dataSet.name);

    // remove expression3 documents that don't have any data
    Expression3.remove({
      data_set_id: data_set_id,
      rsem_quan_log2: { $size:  0 }
    });

    // remove expression3Doc.rsem_quan_log2 array values not associated with
    // a sample in dataSet.gene_expression

    var sampleArray = []; // default if gene_expression undefined
    if (dataSet.gene_expression) {
      sampleArray = dataSet.gene_expression;
    }
    sampleLength = sampleArray.length;

    // "To use the $slice modifier, it must appear with the $each modifier.
    // You can pass an empty array [] to the $each modifier such that only
    // the $slice modifier has an effect."
    // - https://docs.mongodb.org/manual/reference/operator/update/slice/
    Expression3.update({
      data_set_id: data_set_id,
      $where: function () { return this.rsem_quan_log2.length !== sampleLength; },
    }, {
      $push: {
        rsem_quan_log2: {
          $each: [],
          $slice: sampleLength
        }
      }
    }, { multi: true });



    // regenerate dataSet.gene_expression_index from dataSet.gene_expression,
    // compare to current index

    var currentIndex = dataSet.gene_expression_index;
    if (!currentIndex) {
      currentIndex = {};
    }
    var correctIndex = {};

    for (var i = 0; i < sampleLength; i++) {
      correctIndex[sampleArray[i]] = i;
    }
    if (!_.isEqual(correctIndex, currentIndex)) {
      console.log("There was a discrepancy between the gene_expression_index " +
          "in " + data_set_id + " and the 'correct' index.");
      console.log("currentIndex !== correctIndex (bad!!!)");
      // console.log("dataSet.gene_expression:", sampleArray);
      // console.log("currentIndex:", currentIndex);
      // console.log("correctIndex:", correctIndex);

      console.log("setting to correctIndex...");
      DataSets.update(data_set_id, {
        $set: {
          gene_expression_index: correctIndex
        }
      });
    }



    // make sure gene_expression_genes is set

    if (!dataSet.gene_expression_genes) {
      // gene_expression_genes has never been set, so we will calculate it from
      // expression3 data if that is present

      if (Expression3.findOne({ data_set_id: data_set_id })) {
        // there's existing data, so let's make sure we match that

        // get a sorted list of all of the distinct `gene_label`s in Expression3
        // for this dataSet
        var existingDistinctGenes = Expression3.aggregate([
          {$match: {data_set_id: data_set_id}},
          {$group: {_id: ":)", "genes": {$addToSet: "$gene_label"}}}
        ])[0].genes.sort();

        // NOTE: node hangs if we try to do this update through the non-raw
        // collection because the array is so large (20,000+ elements)
        DataSets.rawCollection().update({_id: data_set_id}, {
          $set: { gene_expression_genes: existingDistinctGenes }
        }, function (error, result) {
          if (error) {
            console.log(data_set_id,
                "gene_expression_genes update error:", error);
          }
        });

        console.log(data_set_id,
            "gene_expression_genes calculated from existing Expression3 data");
      }
    }
  });

  console.log("done with referential integrity maintenance");
};
