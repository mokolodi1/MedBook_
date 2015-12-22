// TODO: change this to accept options instead of wrangler_file_id
function RectangularGeneExpression (wrangler_file_id) {
  RectangularGeneAssay.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  this.loadGeneMapping.call(this);
  this.setSubmissionType.call(this, 'gene_expression');
}

RectangularGeneExpression.prototype =
    Object.create(RectangularGeneAssay.prototype);
RectangularGeneExpression.prototype.constructor = RectangularGeneExpression;

RectangularGeneExpression.prototype.checkDataExists = function (sample_label) {
  var query = {
    sample_label: sample_label,
  };
  query["values." + this.wranglerFile.options.normalization] = { $exists: true };

  // TODO: add index for findOne
  if (GeneExpression.findOne(query)) {
    return true;
  }
};

RectangularGeneExpression.prototype.getNormalizationLabel =
    _.partial(getNormalizationLabel, GeneExpression);

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

  if (lineNumber === 1) { // header line
    this.verifyAtLeastTwoColumns.call(this, brokenTabs);

    this.setSampleLabels.call(this, brokenTabs); // wrangle sample labels
    console.log("this.sampleLabels:", this.sampleLabels);

    this.ensureClinicalExists.call(this); // add the sample_labels to the studies table if necessary

    if (this.wranglerPeek) {
      this.line_count = 0;
      this.alertDataExists.call(this); // check to see if collection already has data like this
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
    if (!gene_label) { // ignore the gene if it doesn't map
      return;
    }

    if (this.wranglerPeek) {
      this.line_count++;
    } else {
      // insert into GeneExpression
      var bulk = GeneExpression.rawCollection().initializeUnorderedBulkOp();
      for (var index in expressionStrings) {
        var sample_label = this.sampleLabels[index];

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

WranglerFileTypes.RectangularGeneExpression = RectangularGeneExpression;
