/*
* Maintains relationship between studies and expression3
* 1. Make sure there's no elements in expression3Doc.rsem_quan_log2 not
*    associated with any sample in the study
* 2. Make sure study.gene_expression_index is looking good
* 3. If study.gene_expression_genes isn't defined, calculate it from
*    documents in expression3
*/
MedBook.referentialIntegrity.studies_expression3 = function (studiesQuery) {
  console.log("starting referential integrity maintenance" +
      " (studies ==> expression3)");

  if (!studiesQuery) { // default to all studies
    studiesQuery = {};
  }

  Studies.find(studiesQuery).forEach(function (study) {
    var study_label = study.id;
    console.log("study_label:", study_label);

    // remove expression3 documents that don't have any data
    Expression3.remove({
      study_label: study_label,
      rsem_quan_log2: { $size:  0 }
    });

    // remove expression3Doc.rsem_quan_log2 array values not associated with
    // a sample in study.gene_expression

    var sampleArray = []; // default if gene_expression undefined
    if (study.gene_expression) {
      sampleArray = study.gene_expression;
    }
    sampleLength = sampleArray.length;

    // "To use the $slice modifier, it must appear with the $each modifier.
    // You can pass an empty array [] to the $each modifier such that only
    // the $slice modifier has an effect."
    // - https://docs.mongodb.org/manual/reference/operator/update/slice/
    Expression3.update({
      study_label: study_label,
      $where: function () { return this.rsem_quan_log2.length !== sampleLength; },
    }, {
      $push: {
        rsem_quan_log2: {
          $each: [],
          $slice: sampleLength
        }
      }
    }, { multi: true });



    // regenerate study.gene_expression_index from study.gene_expression,
    // compare to current index

    var currentIndex = study.gene_expression_index;
    if (!currentIndex) {
      currentIndex = {};
    }
    var correctIndex = {};

    for (var i = 0; i < sampleLength; i++) {
      correctIndex[sampleArray[i]] = i;
    }
    if (!_.isEqual(correctIndex, currentIndex)) {
      console.log("There was a discrepancy between the gene_expression_index " +
          "in " + study_label + " and the 'correct' index.");
      console.log("currentIndex !== correctIndex (bad!!!)");
      console.log("study.gene_expression:", sampleArray);
      console.log("currentIndex:", currentIndex);
      console.log("correctIndex:", correctIndex);

      console.log("setting to correctIndex...");
      Studies.update({id: study_label}, {
        $set: {
          gene_expression_index: correctIndex
        }
      });
    }



    // make sure gene_expression_genes is set

    if (!study.gene_expression_genes) {
      // gene_expression_genes has never been set, so we will calculate it from
      // expression3 data if that is present

      if (Expression3.findOne({ study_label: study_label })) {
        // there's existing data, so let's make sure we match that

        // get a sorted list of all of the distinct `gene_label`s in Expression3
        // for this study
        var existingDistinctGenes = Expression3.aggregate([
          {$match: {study_label: study_label}},
          {$group: {_id: ":)", "genes": {$addToSet: "$gene_label"}}}
        ])[0].genes.sort();

        // NOTE: node hangs if we try to do this update through the non-raw
        // collection because the array is so large (20,000+ elements)
        Studies.rawCollection().update({id: study_label}, {
          $set: { gene_expression_genes: existingDistinctGenes }
        }, function (error, result) {
          if (error) {
            console.log(study_label,
                "gene_expression_genes update error:", error);
          }
        });

        console.log(study_label,
            "gene_expression_genes calculated from existing Expression3 data");
      }
    }
  });

  console.log("done with referential integrity maintenance");
};

// for removing empty entries
Moko.ensureIndex(Expression3, {
  study_label: 1,
  rsem_quan_log2: 1,
});
