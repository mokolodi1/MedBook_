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
    var study_label = this.submission.options.study_label;

    // maintain referential integrity between "studies" and "expression3"
    MedBook.referentialIntegrity.studies_expression3({
      id: study_label
    });

    // lock the study for wrangling, tell them to try again if it's already locked

    var securedLock = Studies.update({
      id: study_label,
      gene_expression_wrangling: { $ne: true },
    }, {
      $set: {
        gene_expression_wrangling: true,
      }
    });
    if (securedLock !== 1) {
      throw "Someone is already wrangling data for this study. " +
          "Please try again in a few minutes. " +
          "If you continue to see this message, " +
          "contact Teo at mokolodi1@gmail.com";
    }
  }
};

RectangularGeneExpression.prototype.alertIfSampleDataExists = function () {
  alertIfSampleDataExists.call(this,
      "Quantile normalized counts log2(x+1)",
      function (sample_label) {
        // TODO: add back study_label (taken out because we don't have it
        // the first time around)
        return Studies.findOne({
          // study_label: this.wranglerFile.options.study_label,
          gene_expression: sample_label,
        });
      });
};
Moko.ensureIndex(Studies, {
  // study_label: 1,
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
  // Otherwise, just do a regular insert

  var expressionQuery = {
    study_label: this.submission.options.study_label,
    gene_label: gene_label,
  };

  var seenCount = this.geneLabelIndex[gene_label];
  if (seenCount) {
    var allData = Expression3.findOne(query).rsem_quan_log2;
    var startIndex = allData.length - 1 - log2Values.length;

    console.log("existing data:", existingData);
    console.log("log2Values:", log2Values);
    for (var i = 0; i < oldData.length; i++) {
      var allDataIndex = i + startIndex;
      // do the average
      var averaged = (allData[allDataIndex] * seenCount + log2Values[i]) /
          (seenCount + 1);
      allData[allDataIndex] = averaged;
    }
    console.log("data:", existingData);

    // put the data back into the existing data and update...
    Expression3.update(expressionQuery, {
      rsem_quan_log2: allData
    });
  } else {
    Expression3.upsert(expressionQuery, {
      $push: { rsem_quan_log2: { $each: log2Values } }
    });
  }
};
Moko.ensureIndex(Expression3, {
  study_label: 1,
  gene_label: 1,
});

RectangularGeneExpression.prototype.endOfFile = function () {
  var sortedGenes = Object.keys(this.geneLabelIndex).sort();

  // // make sure there's no duplicates in the genes
  //
  // if (this.geneLabels.length !== sortedGenes.length) {
  //   // there were duplicates... now on to figure out what they were!
  //
  //   // NOTE: sorting here could technically break things later if we assume
  //   // it hasn't been sorted
  //   this.geneLabels.sort();
  //
  //   var maxDuplicates = 5;
  //   var duplicates = [];
  //   for (var i = 1; i < this.geneLabels.length; i++) {
  //     var current = this.geneLabels[i];
  //
  //     // only show a duplicate once
  //     if (duplicates[duplicates.length - 1] === current) {
  //       continue;
  //     }
  //
  //     // if a duplicate, add it to the list
  //     if (this.geneLabels[i - 1] === current) {
  //       duplicates.push(current);
  //     }
  //
  //     // actually look for maxDuplicates + 1 so we know if we need a "..."
  //     if (duplicates > maxDuplicates) {
  //       break;
  //     }
  //   }
  //
  //   var duplicatesString = duplicates.slice(0, 5).join(", ");
  //   if (duplicates.length > maxDuplicates) {
  //     duplicatesString += "...";
  //   }
  //
  //   throw "Duplicate genes: " + duplicatesString;
  // }

  // check to make sure the genes match up with existing data

  if (!this.wranglerPeek) {
    var study_label = this.submission.options.study_label;
    var study = Studies.findOne({id: study_label});
    var studyGenes = study.gene_expression_genes;

    // if study.gene_expression_genes isn't set, make this file's genes
    // the master set
    if (!studyGenes) {
      // NOTE: node hangs if we try to do this update through the non-raw
      // collection because the array is so large (20,000+ elements)
      Studies.rawCollection().update({id: study_label}, {
        $set: { gene_expression_genes: sortedGenes }
      });

      studyGenes = sortedGenes;
      console.log("this file's genes are now the master geneset for this study");
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
    var dataType = "Quantile normalized counts log2(x+1)";
    addExpressionSummaryDoc.call(this, dataType);
  } else {
    // update data in studies

    var sampleCount = 0; // default to 0
    if (study.gene_expression) {
      sampleCount = study.gene_expression.length;
    }

    var setObject = {
      gene_expression_wrangling: false // unlock for others
    };
    _.each(this.sampleLabels, function (sample_label, index) {
      setObject["gene_expression_index." + sample_label] = sampleCount + index;
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
