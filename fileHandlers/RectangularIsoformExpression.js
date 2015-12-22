// TODO: change this to accept options instead of wrangler_file_id
function RectangularIsoformExpression (wrangler_file_id) {
  RectangularGeneAssay.call(this, {
    wrangler_file_id: wrangler_file_id,
  });

  this.loadTranscriptMapping.call(this);
  this.setSubmissionType.call(this, 'isoform_expression');
}

RectangularIsoformExpression.prototype =
    Object.create(RectangularGeneAssay.prototype);
RectangularIsoformExpression.prototype.constructor = RectangularIsoformExpression;

RectangularIsoformExpression.prototype.checkDataExists = function (sample_label) {
  var query = {
    sample_label: sample_label,
  };
  query["values." + this.wranglerFile.options.normalization] = { $exists: true };

  // TODO: add index for findOne
  if (IsoformExpression.findOne(query)) {
    return true;
  }
};

RectangularIsoformExpression.prototype.getNormalizationLabel =
    _.partial(getNormalizationLabel, IsoformExpression);

function getSetObject (parsedValue) {
  // calculate autoValues ;)
  var values = {};
  values[this.wranglerFile.options.normalization] = parsedValue;
  var onlyValues = {
    values: values
  };
  IsoformExpression.simpleSchema().clean(onlyValues);
  values = onlyValues.values; // squeaky clean

  var setObject = {};
  var keys = Object.keys(onlyValues.values);
  _.each(keys, function (normalization) {
    setObject['values.' + normalization] = values[normalization];
  });

  return setObject;
}

RectangularIsoformExpression.prototype.parseLine =
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

    // try to find the gene based on the transcript label
    var geneTranscript = brokenTabs[0].split("/");
    var gene_in_file = geneTranscript[0];
    var splitIsoformId = geneTranscript[1].split(".");
    var transcript_label = splitIsoformId[0];
    // NOTE: I thought about mapping the isoform version (bumping it to match)
    // what we have on file for the gene), but that kind of mapping is
    // unnecessary. Splitting the transcript_label and _version up into two
    // fields means that queries can merge versions if they choose to do so.
    var transcript_version = parseInt(splitIsoformId[1], 10);

    // // update expression2 isoform equivalent
    // // NOTE: this will be deprecated soon
    // if (!this.wranglerPeek) {
    //   // insert into expression2 without mapping or anything
    //   // console.log("need to write expression_isoform insert method");
    //   // Expression2Insert.call(this, brokenTabs[0], this.sampleLabels, expressionStrings);
    // }

    var associatedGene = this.transcriptMapping[transcript_label];
    var gene_label; // NOTE: gene_label only set when it's a valid gene
    if (associatedGene) {
      gene_label = associatedGene.gene_label;
    }
    // TODO: perhaps use the gene information in the file and put it through
    // this.geneMapping

    if (this.wranglerPeek && gene_label && gene_label !== gene_in_file) {
      this.insertWranglerDocument.call(this, {
        document_type: "mapped_genes",
        contents: {
          gene_in_file: gene_in_file,
          mapped_gene: gene_label,
        }
      });
    }

    if (this.wranglerPeek) {
      this.line_count++;
    } else {
      // insert into IsoformExpression
      var bulk = IsoformExpression.rawCollection().initializeUnorderedBulkOp();
      for (var index in expressionStrings) {
        var sample_label = this.sampleLabels[index];

        // TODO: check on simpleschema (merge setObject, query)

        var query = {
          study_label: this.submission.options.study_label,
          collaborations: [this.submission.options.collaboration_label],
          transcript_label: transcript_label,
          transcript_version: transcript_version,
          sample_label: sample_label,
        };
        // so that gene_label does not exist, not set to null (simpleschema
        // changes undefined values to null)
        if (gene_label) {
          _.extend(query, {
            gene_label: gene_label
          });
        }

        var setObject = getSetObject.call(this, parseFloat(expressionStrings[index]));
        bulk.find(query).upsert().updateOne({
          $set: setObject
        });
      }

      var deferred = Q.defer();
      bulk.execute(errorResultResolver(deferred));
      return deferred.promise;
    }
  }
};

Moko.ensureIndex(IsoformExpression, {
  study_label: 1,
  collaborations: 1,
  gene_label: 1,
  transcript_label: 1,
  transcript_version: 1,
  sample_label: 1,
});

WranglerFileTypes.RectangularIsoformExpression = RectangularIsoformExpression;
