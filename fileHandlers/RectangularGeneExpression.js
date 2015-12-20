// TODO: change this to accept options instead of wrangler_file_id
function RectangularGeneExpression (wrangler_file_id) {
  RectangularGeneAssay.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  this.setSubmissionType.call(this, 'gene_expression');
}

RectangularGeneExpression.prototype =
    Object.create(RectangularGeneAssay.prototype);
RectangularGeneExpression.prototype.constructor = RectangularGeneExpression;

function getSetObject (parsedValue) {
  // calculate autoValues ;)
  var values = {};
  values[this.wranglerFile.options.normalization] = parsedValue;
  var onlyValues = {
    values: values
  };
  GeneExpression.simpleSchema().clean(onlyValues);
  values = onlyValues.values; // squeaky clean

  var setObject = {};
  var keys = Object.keys(onlyValues.values);
  _.each(keys, function (normalization) {
    setObject['values.' + normalization] = values[normalization];
  });

  return setObject;
}

RectangularGeneExpression.prototype.parseLine =
    function (brokenTabs, lineNumber, line) {
  if (lineNumber % 1000 === 0) {
    console.log("lineNumber:", lineNumber);
  }

  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  var index; // used in loops
  var sample_label; // used multiple times

  if (lineNumber === 1) { // header line
    if (brokenTabs.length < 2) {
      throw "Expected 2+ column tab file, got " + brokenTabs.length +
          " column tab file";
    }

    // wrangle sample labels
    this.setSampleLabels.call(this, brokenTabs);
    console.log("this.sampleLabels:", this.sampleLabels);

    // add the sample_labels to the studies table if necessary
    if (!this.wranglerPeek) {
      this.ensureClinicalExists.call(this);
    }

    if (this.wranglerPeek) {
      this.gene_count = 0;

      // check to see if gene_expression already has data like this

      // TODO: search for collaboration, study
      // NOTE: currently any user can figure out if a certain
      //       sample has gene_expression data.
      var normalization = this.wranglerFile.options.normalization;
      var normalizationLabel = getNormalizationLabel(normalization);
      for (index in this.sampleLabels) {
        sample_label = this.sampleLabels[index];

        var query = {
          sample_label: sample_label,
        };
        query["values." + normalization] = { $exists: true };

        // TODO: add index for findOne
        if (GeneExpression.findOne(query)) {
          this.insertWranglerDocument.call(this, {
            document_type: 'gene_expression_data_exists',
            contents: {
              file_name: this.blob.original.name,
              sample_label: sample_label,
              normalization: normalizationLabel,
            }
          });
        }
      }
    }
  } else { // rest of file
    var expressionStrings = brokenTabs.slice(1);
    validateNumberStrings(expressionStrings);

    // update expression2
    // NOTE: this will be deprecated soon
    if (!this.wranglerPeek) {
      // insert into expression2 without mapping or anything
      Expression2Insert.call(this, brokenTabs[0], this.sampleLabels, expressionStrings);
    }

    // map the gene based on synonymes and previouses
    var gene_label = this.mapGeneLabel.call(this, brokenTabs[0]);
    if (!gene_label) {
      return; // ignore the gene
    }

    if (this.wranglerPeek) {
      this.gene_count++;
    } else {
      // insert into GeneExpression
      var bulk = GeneExpression.rawCollection().initializeUnorderedBulkOp();
      for (index in expressionStrings) {
        sample_label = this.sampleLabels[index];

        // TODO: check on simpleschema (merge setObject, query)

        var setObject = getSetObject.call(this, parseFloat(expressionStrings[index]));
        bulk.find({
          study_label: this.submission.options.study_label,
          collaborations: [this.submission.options.collaboration_label],
          gene_label: gene_label,
          sample_label: sample_label,
        }).upsert().updateOne({
          $set: setObject
        });
      }

      var deferred = Q.defer();
      bulk.execute(errorResultResolver(deferred));
      return deferred.promise;
    }
  }
};

Moko.ensureIndex(GeneExpression, {
  study_label: 1,
  collaborations: 1,
  gene_label: 1,
  sample_label: 1,
});

RectangularGeneExpression.prototype.endOfFile = function () {
  if (this.wranglerPeek) {
    var normalization = this.wranglerFile.options.normalization;
    var normalization_description = getNormalizationLabel(normalization);

    for (var index in this.sampleLabels) {
      var sample_label = this.sampleLabels[index];

      this.insertWranglerDocument.call(this, {
        document_type: 'sample_normalization',
        contents: {
          sample_label: sample_label,
          normalization_description: normalization_description,
          gene_count: this.gene_count,
        }
      });
    }
  }
};

WranglerFileTypes.RectangularGeneExpression = RectangularGeneExpression;
