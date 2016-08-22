// TODO: change this to accept options instead of wrangler_file_id
function RectGenomicExpression (wrangler_file_id) {
  RectangularGeneAssay.call(this, wrangler_file_id);

  this.setSubmissionType.call(this, 'genomic_expression');
}

RectGenomicExpression.prototype =
    Object.create(RectangularGeneAssay.prototype);
RectGenomicExpression.prototype.constructor = RectGenomicExpression;

RectGenomicExpression.prototype.beforeParsing = function () {
  if (!this.wranglerPeek) {
    var data_set_id = this.wranglerFile.options.data_set_id;

    MedBook.referentialIntegrity.DataSets_GenomicExpression(data_set_id);

    // lock the data set for wrangling,
    // tell them to try again if it's already locked

    var securedLock = DataSets.update({
      _id: data_set_id,
      currently_wrangling: { $ne: true },
    }, {
      $set: {
        currently_wrangling: true,
      }
    });
    if (securedLock !== 1) {
      if (Jobs.findOne({ name: "SubmitWranglerFile", status: "running" })) {
        throw "Someone is already wrangling data for this data set. " +
            "Please try again in a few minutes. " +
            "If you continue to see this message, " +
            "contact Teo at dtflemin@ucsc.edu";
      }
    }
  }
};

RectGenomicExpression.prototype.insertToCollection =
    function (feature_label, expressionStrings) {
  // convert expressionStrings into numbers, convert log2 transforms
  var scaling_to_perform = this.wranglerFile.options.scaling_to_perform;
  var addingValues = _.map(expressionStrings, function (value) {
    var numberVal = parseFloat(value);

    if (scaling_to_perform === "log2(x+1)") {
      return Math.log(numberVal + 1) / Math.LN2;
    } if (scaling_to_perform === "none") {
      return numberVal;
    } else {
      throw new Meteor.Error("scaling-behavior-undefined");
    }
  });

  // If we've already seen this gene before, average with existing data.
  // Otherwise, just do a regular insert.

  var expressionQuery = {
    data_set_id: this.wranglerFile.options.data_set_id,
    feature_label: feature_label,
  };

  var seenCount = this.geneLabelIndex[feature_label];
  if (seenCount) {
    var allData = GenomicExpression.findOne(expressionQuery).values;
    var startIndex = allData.length - addingValues.length;

    for (var i = 0; i < addingValues.length; i++) {
      var allDataIndex = i + startIndex;
      // do the average
      var averaged = (allData[allDataIndex] * seenCount + addingValues[i]) /
          (seenCount + 1);
      allData[allDataIndex] = averaged;
    }

    // put the data back into the existing data and update...
    GenomicExpression.update(expressionQuery, {
      $set: { values: allData }
    });
  } else {
    GenomicExpression.upsert(expressionQuery, {
      $push: { values: { $each: addingValues } }
    });
  }
};
Moko.ensureIndex(GenomicExpression, {
  data_set_id: 1,
  feature_label: 1,
});

RectGenomicExpression.prototype.endOfFile = function () {
  var sortedGenes = Object.keys(this.geneLabelIndex).sort();

  // check to make sure the genes match up with existing data

  var data_set_id = this.wranglerFile.options.data_set_id;
  var dataSet = DataSets.findOne(data_set_id);
  var dataSetFeatures = dataSet.feature_labels;

  if (!this.wranglerPeek) {
    // if dataSet.feature_labels isn't set, make this file's genes
    // the master set
    if (!dataSetFeatures) {
      // NOTE: node hangs if we try to do this update through the non-raw
      // collection because the array is so large (20,000+ elements)
      DataSets.rawCollection().update({ _id: data_set_id }, {
        $set: { feature_labels: sortedGenes }
      }, function (error) {
        if (error) {
          console.log("error setting feature_labels for data set " +
              data_set_id + ": " + error);
        }
      });

      dataSetFeatures = sortedGenes;
      console.log("this file's genes are now the master geneset " +
          "for this data set");
    }
  }

  if (dataSetFeatures) {
    // compare the genes in the file to feature_labels

    if (dataSetFeatures.length !== sortedGenes.length) {
      throw "Features do not match data set features.";
    }
    for (var i = 0; i < dataSetFeatures.length; i++) {
      if (dataSetFeatures[i] !== sortedGenes[i]) {
        throw "Features do not match data set features.";
      }
    }
  }

  // do some other stuff

  if (this.wranglerPeek) {
    // add a summary doc
    for (var index in this.sampleLabels) {
      var sample_label = this.sampleLabels[index];

      this.insertWranglerDocument.call(this, {
        document_type: "assay_sample_summary",
        contents: {
          sample_label: sample_label,
          data_set_name: dataSet.name,
          line_count: this.line_count,
        }
      });
    }
  } else {
    // update data in DataSets

    var sampleCount = 0; // default to 0
    if (dataSet.sample_labels) {
      sampleCount = dataSet.sample_labels.length;
    }

    var setObject = {
      currently_wrangling: false, // unlock for others
      sample_label_index: dataSet.sample_label_index
    };
    _.each(this.sampleLabels, function (sample_label, index) {
      setObject.sample_label_index[sample_label] = sampleCount + index;
    });

    // If this one atomic operation fails or we don't get to it while loading
    // data, the collection will be cleaned up during the referential integrity
    // check (see beforeParsing function)
    DataSets.update(data_set_id, {
      $push: { sample_labels: { $each: this.sampleLabels } },
      $set: setObject,
    });
  }
};
Moko.ensureIndex(GenomicExpression, {
  data_set_id: 1,
});

RectGenomicExpression.prototype.cleanupAfterError = function () {
  if (!this.wranglerPeek) {
    DataSets.rawCollection().update(this.wranglerFile.options.data_set_id, {
      $set: {
        currently_wrangling: false
      }
    }, function (error, result) {
      if (error) {
        console.log("error cleaning up data_sets collection after error " +
            "during wrangling");
        console.log("error:", error);
      } else {
        console.log("cleaned up data_sets collection after " +
            " error during wrangler");
        console.log("result:", result);
      }
    });
  }
}

WranglerFileHandlers.RectGenomicExpression = RectGenomicExpression;
