// TODO: change this to accept options instead of wrangler_file_id
function RectangularGeneExpression (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  loadGeneMapping.call(this);
  this.setSubmissionType.call(this, 'gene_expression');
}

RectangularGeneExpression.prototype =
    Object.create(TabSeperatedFile.prototype);
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

function loadGeneMapping () {
  var self = this;

  this.geneMapping = {}; // for use in validateGeneLabel
  function addGeneMapping (attribute, newValue) {
    if (self.geneMapping[attribute]) {
      // NOTE: should never be run (see condition in addMappingsInArray)
      console.log("geneMapping[" + attribute + "] overridden from " +
          self.geneMapping[attribute] + " to " + newValue);
    }

    // prefer mapping gene ==> gene (rather than synonym ==> gene)
    // see order of loading below
    if (self.geneMapping[attribute] !== attribute) {
      self.geneMapping[attribute] = newValue;
    }
  }

  console.log("loading valid genes");

  // this.geneMapping["asdf"] = "asdf"
  Genes.find({}).forEach(function (doc) {
    addGeneMapping(doc.gene_label, doc.gene_label);
  });

  function addMappingsInArray(arrayAttribute, doc) {
    for (var index in doc[arrayAttribute]) {
      var value = doc[arrayAttribute][index];
      if (!self.geneMapping[value]) {
        addGeneMapping(value, doc.gene_label);
      }
    }
  }

  // map synonym_labels to respective gene_labels, then previous_labels
  Genes.find({}).forEach(_.partial(addMappingsInArray, "synonym_labels"));
  Genes.find({}).forEach(_.partial(addMappingsInArray, "previous_labels"));

  console.log("done loading valid genes");
}

// map a gene label into HUGO namespace
function mapGeneLabel (originalGeneLabel) {
  var mappedGeneLabel = this.geneMapping[originalGeneLabel];

  // make sure the user knows we're ignoring/mapping the gene if applicable
  if (!mappedGeneLabel) {
    if (this.wranglerPeek) {
      this.insertWranglerDocument.call(this, {
        document_type: "ignored_genes",
        contents: {
          gene: originalGeneLabel
        }
      });
    }
    return; // ignore the gene
  } else if (mappedGeneLabel !== originalGeneLabel) {
    if (this.wranglerPeek) {
      this.insertWranglerDocument.call(this, {
        document_type: "mapped_genes",
        contents: {
          gene_in_file: originalGeneLabel,
          mapped_gene: mappedGeneLabel
        }
      });
    }
  }

  return mappedGeneLabel;
}

RectangularGeneExpression.prototype.parseLine =
    function (brokenTabs, lineNumber, line) {
  if (lineNumber % 1000 === 0) {
    console.log("lineNumber:", lineNumber);
  }

  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  if (lineNumber === 1) { // header line
    if (brokenTabs.length < 2) {
      throw "Expected 2+ column tab file, got " + brokenTabs.length +
          " column tab file";
    }

    setSampleLabels.call(this, brokenTabs); // wrangle sample labels
    console.log("this.sampleLabels:", this.sampleLabels);

    // TODO: run all the time when we get the study_label before the peek
    if (!this.wranglerPeek) {
      for (var sampleIndex in this.sampleLabels) {
        var sampleLabel = this.sampleLabels[sampleIndex];
        ensureClinicalExists.call(this, this.submission.options.study_label, sampleLabel);
      }
    }

    if (this.wranglerPeek) {
      this.line_count = 0;
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
    var gene_label = mapGeneLabel.call(this, brokenTabs[0]);
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

RectangularGeneExpression.prototype.endOfFile = function () {
  var dataType = GeneExpression.simpleSchema().schema()
      ['values.' + this.wranglerFile.options.normalization].label;
  addExpressionSummaryDoc.call(this, dataType);
};

WranglerFileTypes.RectangularGeneExpression = RectangularGeneExpression;
