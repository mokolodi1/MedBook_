// TODO: change this to accept options instead of wrangler_file_id
function RectangularGeneExpression (wrangler_file_id) {
  RectangularGeneAssay.call(this, wrangler_file_id);

  this.setSubmissionType.call(this, 'gene_expression');
}

RectangularGeneExpression.prototype =
    Object.create(RectangularGeneAssay.prototype);
RectangularGeneExpression.prototype.constructor = RectangularGeneExpression;

RectangularGeneExpression.prototype.alertIfSampleDataExists = function () {
  alertIfSampleDataExists.call(this,
      "Quantile normalized counts log2(x+1)",
      function (sample_label) {
        return Studies.findOne({
          study_label: this.wranglerFile.options.study_label,
          gene_expression: sample_label,
        });
      });
};
Moko.ensureIndex(Studies, {
  study_label: 1,
  gene_expression: 1,
});

function Expression2Insert (gene, sampleLabels, expressionStrings) {
  // do some checks
  if (sampleLabels.length !== expressionStrings.length) {
    throw "Internal error: sampleLabels not the same length as " +
        " expressionStrings!";
  }

  var setObject = {};
  for (var index in sampleLabels) {
    var value = expressionStrings[index];
    var normalization = this.wranglerFile.options.normalization;
    var exceptNormalization = "samples." + sampleLabels[index] + ".";
    var parsedValue = parseFloat(value);
    setObject[exceptNormalization + normalization] = parsedValue;

    if (normalization === 'quantile_counts') {
      var log2Value = Math.log(parsedValue + 1) / Math.LN2;
      setObject[exceptNormalization + 'rsem_quan_log2'] = log2Value;
    }
  }
  Expression2.upsert({
    gene: gene,
    Study_ID: this.submission.options.study_label,
    Collaborations: [this.submission.options.collaboration_label],
  }, {
    $set: setObject
  });
}
Moko.ensureIndex(Expression2, {
  gene: 1,
  Study_ID: 1,
  Collaborations: 1,
});

RectangularGeneExpression.prototype.updateOldStuff =
    function (brokenTabs, expressionStrings) {
  // update expression2
  // NOTE: this will be deprecated soon
  if (!this.wranglerPeek) {
    // insert into expression2 without mapping or anything
    Expression2Insert.call(this, brokenTabs[0], this.sampleLabels, expressionStrings);
  }
};

RectangularGeneExpression.prototype.insertToCollection =
    function (gene_label, expressionStrings) {
  // make sure we're dealing with quantile_counts (not already transformed)
  if (this.wranglerFile.options.normalization !== "quantile_counts") {
    throw new Error("Normalizations other than quantile counts are not supported");
  }

  // convert expressionStrings into numbers, convert log2 transforms
  var log2Floats = _.map(expressionStrings, function (value) {
    var float = parseFloat(value);
    return Math.log(float + 1) / Math.LN2;
  });

  var bulk = Expression3.rawCollection().initializeUnorderedBulkOp();

  bulk.find({
    study_label: this.submission.options.study_label,
    gene_label: gene_label,
  }).upsert().updateOne({
    $push: { rsem_quan_log2: { $each: log2Floats } }
  });

  var deferred = Q.defer();
  bulk.execute(errorResultResolver(deferred));
  return deferred.promise;
};
Moko.ensureIndex(Expression3, {
  study_label: 1,
  gene_label: 1,
});

RectangularGeneExpression.prototype.beforeParsing = function () {
  if (!this.wranglerPeek) {
    // maintain referential integrity between "studies" and "expression3"
    console.log("starting referential integrity maintenance" +
      " (studies ==> expression3)");

    var study_label = this.submission.options.study_label;
    var study = Studies.findOne({id: study_label});

    // remove expression3Doc.rsem_quan_log2 array values not associated with
    // a sample in study.gene_expression
    var sampleLength = study.gene_expression.length;

    // "To use the $slice modifier, it must appear with the $each modifier.
    // You can pass an empty array [] to the $each modifier such that only
    // the $slice modifier has an effect."
    // - https://docs.mongodb.org/manual/reference/operator/update/slice/
    Expression3.update({
      study_label: "prad_wcdt",
      $where: function () { return this.rsem_quan_log2.length !== sampleLength; },
    }, {
      $push: {
        rsem_quan_log2: {
          $each: [],
          $slice: sampleLength
        }
      }
    }, { multi: true });

    // regenerate study.gene_expression_index from study.gene_expression
    // TODO: do we need this?

    console.log("done with referential integrity maintenance");
  }
};

RectangularGeneExpression.prototype.endOfFile = function () {
  // do a bunch of gene validation

  // make sure there's no duplicates in the genes
  var sortedGenes = Object.keys(this.geneLabelIndex).sort();
  if (this.geneLabels.length !== sortedGenes.length) {
    console.log("duplicate genes :(");
    throw "Duplicate genes!";
  }

  // check to make sure the genes match up with existing data
  if (!this.wranglerPeek) {
    var study_label = this.submission.options.study_label;
    var study = Studies.findOne({id: study_label});

    // make sure we have gene_expression_genes is set
    // if studyGenes starts out falsey, it's set down below
    var studyGenes = study.gene_expression_genes;
    if (!studyGenes) {
      // gene_expression_genes has never been set...

      if (Expression3.findOne({ study_label: study_label })) {
        // there's existing data, so let's make sure we match that

        // get a sorted list of all of the distinct `gene_label`s in Expression3
        // for this study
        var existingDistinctGenes = Expression3.aggregate([
          {$match: {study_label: study_label}},
          {$group: {_id: ":)", "genes": {$addToSet: "$gene_label"}}}
        ])[0].genes.sort();

        // NOTE: node hangs if we try to do this update through the non-raw
        // collection
        Studies.rawCollection().update({id: study_label}, {
          $set: { gene_expression_genes: existingDistinctGenes }
        }, function (error, result) {
          if (error) {
            console.log("gene_expression_genes error:", error);
          }
          console.log("gene_expression_genes result:", result);
        });

        studyGenes = existingDistinctGenes;
        console.log(
            "gene_expression_genes calculated from existing Expression3 data");
      } else {
        // use this sample's data as the master geneset
        Studies.update({id: study_label}, {
          $set: { gene_expression_genes: sortedGenes }
        });
        studyGenes = sortedGenes;
        console.log("this file's genes are now the master geneset for this study");
      }
    }

    // compare the genes in the file to gene_expression_genes

    if (studyGenes.length !== sortedGenes.length) {
      throw "Genes do not match study genes.";
    }
    for (var i = 0; i < studyGenes.length; i++) {
      if (studyGenes[i] !== sortedGenes[i]) {
        throw "Genes do not match study genes.";
      }
    }
  }

  // do some other stuff

  if (this.wranglerPeek) {
    // add a summary doc
    var dataType = GeneExpression.simpleSchema().schema()
        ['values.' + this.wranglerFile.options.normalization].label;
    addExpressionSummaryDoc.call(this, dataType);
  } else {
    // update data in studies

    var sampleCount = study.gene_expression.length;
    var setObject = {};
    _.each(this.sampleLabels, function (value, index) {
      setObject["gene_expression_index." + value] = sampleCount + index;
    });

    // If this one atomic operation fails or we don't get to it while loading
    // data, the collection will be cleaned up during the referential integrity
    // check (see beforeParsing function)
    Studies.update({id: study_label}, {
      $push: { gene_expression: { $each: this.sampleLabels } },
      $set: setObject,
    });
  }
};
Moko.ensureIndex(Expression3, {
  study_label: 1,
});

WranglerFileTypes.RectangularGeneExpression = RectangularGeneExpression;
