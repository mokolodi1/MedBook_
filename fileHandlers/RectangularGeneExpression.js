// TODO: change this to accept options instead of wrangler_file_id
function RectangularGeneExpression (wrangler_file_id) {
  RectangularGeneAssay.call(this, wrangler_file_id);

  this.setSubmissionType.call(this, 'gene_expression');
}

RectangularGeneExpression.prototype =
    Object.create(RectangularGeneAssay.prototype);
RectangularGeneExpression.prototype.constructor = RectangularGeneExpression;

RectangularGeneExpression.prototype.beforeParsing = function () {
  // make sure we're dealing with quantile_counts/quantile_counts_log
  var normalization = this.wranglerFile.options.normalization;
  console.log("normalization:", normalization);
  if (normalization !== "quantile_counts" &&
      normalization !== "rsem_quan_log2") {
    throw new Error("Normalizations other than quantile counts and " +
        "quantile counts log are not supported");
  }

  if (!this.wranglerPeek) {
    var data_set_id = this.wranglerFile.options.data_set_id;

    // maintain referential integrity between "data_sets" and "gene_expression"
    MedBook.referentialIntegrity.DataSets_GeneExpression(data_set_id);

    // lock the data set for wrangling,
    // tell them to try again if it's already locked

    var securedLock = DataSets.update({
      _id: data_set_id,
      gene_expression_wrangling: { $ne: true },
    }, {
      $set: {
        gene_expression_wrangling: true,
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

RectangularGeneExpression.prototype.alertIfSampleDataExists = function () {
  alertIfSampleDataExists.call(this,
      "Quantile normalized counts log2(x+1)",
      function (sample_label) {
        return DataSets.findOne({
          data_set_id: this.wranglerFile.options.data_set_id,
          gene_expression: sample_label,
        });
      });
};
Moko.ensureIndex(DataSets, {
  data_set_id: 1,
  gene_expression: 1,
});

RectangularGeneExpression.prototype.insertToCollection =
    function (gene_label, expressionStrings) {
  // convert expressionStrings into numbers, convert log2 transforms
  var normalization = this.wranglerFile.options.normalization;
  var log2Values = _.map(expressionStrings, function (value) {
    var numberVal = parseFloat(value);

    if (normalization === "rsem_quan_log2") {
      return numberVal;
    } else {
      return Math.log(numberVal + 1) / Math.LN2;
    }
  });

  // If we've already seen this gene before, average with existing data.
  // Otherwise, just do a regular insert.

  var expressionQuery = {
    data_set_id: this.wranglerFile.options.data_set_id,
    gene_label: gene_label,
  };

  var seenCount = this.geneLabelIndex[gene_label];
  if (seenCount) {
    var allData = GeneExpression.findOne(expressionQuery).rsem_quan_log2;
    var startIndex = allData.length - log2Values.length;

    for (var i = 0; i < log2Values.length; i++) {
      var allDataIndex = i + startIndex;
      // do the average
      var averaged = (allData[allDataIndex] * seenCount + log2Values[i]) /
          (seenCount + 1);
      allData[allDataIndex] = averaged;
    }

    // put the data back into the existing data and update...
    GeneExpression.update(expressionQuery, {
      $set: { rsem_quan_log2: allData }
    });
  } else {
    GeneExpression.upsert(expressionQuery, {
      $push: { rsem_quan_log2: { $each: log2Values } }
    });
  }
};
Moko.ensureIndex(GeneExpression, {
  data_set_id: 1,
  gene_label: 1,
});

RectangularGeneExpression.prototype.endOfFile = function () {
  var sortedGenes = Object.keys(this.geneLabelIndex).sort();

  // check to make sure the genes match up with existing data

  if (!this.wranglerPeek) {
    var data_set_id = this.wranglerFile.options.data_set_id;
    var dataSet = DataSets.findOne(data_set_id);
    var dataSetGenes = dataSet.gene_expression_genes;

    // if dataSet.gene_expression_genes isn't set, make this file's genes
    // the master set
    if (!dataSetGenes) {
      // NOTE: node hangs if we try to do this update through the non-raw
      // collection because the array is so large (20,000+ elements)
      DataSets.rawCollection().update({ _id: data_set_id }, {
        $set: { gene_expression_genes: sortedGenes }
      }, function (error) {
        if (error) {
          console.log("error setting gene_expression_genes for data set " +
              data_set_id + ": " + error);
        }
      });

      dataSetGenes = sortedGenes;
      console.log("this file's genes are now the master geneset " +
          "for this data set");
    }

    // compare the genes in the file to gene_expression_genes

    if (dataSetGenes.length !== sortedGenes.length) {
      throw "Genes do not match data set genes.";
    }
    for (var i = 0; i < dataSetGenes.length; i++) {
      if (dataSetGenes[i] !== sortedGenes[i]) {
        throw "Genes do not match data set genes.";
      }
    }
  }

  // do some other stuff

  if (this.wranglerPeek) {
    // add a summary doc
    var dataType = "Quantile normalized counts log2(x+1)";
    addExpressionSummaryDoc.call(this, dataType);
  } else {
    // update data in DataSets

    var sampleCount = 0; // default to 0
    if (dataSet.gene_expression) {
      sampleCount = dataSet.gene_expression.length;
    }



    var setObject = {
      gene_expression_wrangling: false, // unlock for others
      gene_expression_index: dataSet.gene_expression_index
    };
    _.each(this.sampleLabels, function (sample_label, index) {
      setObject.gene_expression_index[sample_label] = sampleCount + index;
    });

    // If this one atomic operation fails or we don't get to it while loading
    // data, the collection will be cleaned up during the referential integrity
    // check (see beforeParsing function)
    DataSets.update(data_set_id, {
      $push: { gene_expression: { $each: this.sampleLabels } },
      $set: setObject,
    });
  }
};
Moko.ensureIndex(GeneExpression, {
  data_set_id: 1,
});

RectangularGeneExpression.prototype.cleanupAfterError = function () {
  if (!this.wranglerPeek) {
    DataSets.rawCollection().update(this.wranglerFile.options.data_set_id, {
      $set: {
        gene_expression_wrangling: false
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

WranglerFileHandlers.RectangularGeneExpression = RectangularGeneExpression;
