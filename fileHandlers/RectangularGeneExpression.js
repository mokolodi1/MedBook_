// TODO: change this to accept options instead of wrangler_file_id
function RectangularGeneExpression (wrangler_file_id) {
  RectangularGeneAssay.call(this, wrangler_file_id);

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

RectangularGeneExpression.prototype.alertIfSampleDataExists = function () {
  alertIfSampleDataExists.call(this,
      GeneExpression.simpleSchema().schema()
          ['values.' + this.wranglerFile.options.normalization].label,
      function (sample_label) {
        var query = {
          sample_label: sample_label,
        };
        query["values." + this.wranglerFile.options.normalization] = { $exists: true };

        // TODO: add index for findOne
        if (GeneExpression.findOne(query)) {
          return true;
        }
      });
};

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
};
Moko.ensureIndex(GeneExpression, {
  study_label: 1,
  collaborations: 1,
  gene_label: 1,
  sample_label: 1,
});


WranglerFileTypes.RectangularGeneExpression = RectangularGeneExpression;

RectangularGeneExpression.prototype.endOfFile = function () {
  var dataType = GeneExpression.simpleSchema().schema()
      ['values.' + this.wranglerFile.options.normalization].label;
  addExpressionSummaryDoc.call(this, dataType);
};
