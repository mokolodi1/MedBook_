// TODO: change this to accept options instead of wrangler_file_id
function RectangularIsoformExpression (wrangler_file_id) {
  RectangularGeneAssay.call(this, {
    wrangler_file_id: wrangler_file_id,
  });

  this.loadGeneMapping.call(this);
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

    // wrangle sample labels
    this.setSampleLabels.call(this, brokenTabs);
    console.log("this.sampleLabels:", this.sampleLabels);

    // add the sample_labels to the studies table if necessary
    this.ensureClinicalExists.call(this);

    if (this.wranglerPeek) {
      this.line_count = 0;

      // check to see if collection already has data like this
      this.alertDataExists.call(this);
    }
  } else { // rest of file
    var expressionStrings = brokenTabs.slice(1);
    validateNumberStrings(expressionStrings);

    // try to find the gene based on the transcript label
    var geneTranscript = brokenTabs[0].split("/");
    var originalGeneLabel = geneTranscript[0];
    var splitIsoformId = geneTranscript[1].split(".");
    var transcript_label = splitIsoformId[0];

    // update expression2 isoform equivalent
    // NOTE: this will be deprecated soon
    if (!this.wranglerPeek) {
      // insert into expression2 without mapping or anything
      // console.log("need to write expression_isoform insert method");
      // Expression2Insert.call(this, brokenTabs[0], this.sampleLabels, expressionStrings);
    }

    var associatedGene = this.transcriptMapping[transcript_label];

    if (!associatedGene) {
      if (this.wranglerPeek) {
        var geneKnown = this.geneMapping[originalGeneLabel] ? "known" : "unknown";
        this.insertWranglerDocument.call(this, {
          document_type: "ignored_transcript",
          contents: {
            transcript_id: geneTranscript[1],
            gene_label: originalGeneLabel,
            gene_known: geneKnown,
          }
        });
      }
      // don't continue: ignore
      return;
    }

    // NOTE: we're using associatedGene.gene_label as the right one
    if (associatedGene.gene_label !== originalGeneLabel) {
      if (this.wranglerPeek) {
        this.insertWranglerDocument.call(this, {
          document_type: "mapped_genes",
          contents: {
            gene_in_file: originalGeneLabel,
            mapped_gene: associatedGene.gene_label,
          }
        });
      }
    }

    var transcript_version = _.findWhere(associatedGene.transcripts, {
      label: transcript_label
    }).version;
    if (this.wranglerPeek) {
      var version_in_file = parseInt(splitIsoformId[1], 10);
      if (transcript_version !== version_in_file) {
        this.insertWranglerDocument.call(this, {
          document_type: "transcript_version_mismatch",
          contents: {
            transcript_label: transcript_label,
            version_in_file: version_in_file,
            transcript_version: transcript_version,
          }
        });
      }
    }

    // TODO: check if transcriptVersion matches isoform matched in associatedGene,
    // otherwise add a document

    if (this.wranglerPeek) {
      this.line_count++;
    } else {
      // insert into IsoformExpression
      var bulk = IsoformExpression.rawCollection().initializeUnorderedBulkOp();
      for (var index in expressionStrings) {
        var sample_label = this.sampleLabels[index];

        // TODO: check on simpleschema (merge setObject, query)

        var setObject = getSetObject.call(this, parseFloat(expressionStrings[index]));
        bulk.find({
          study_label: this.submission.options.study_label,
          collaborations: [this.submission.options.collaboration_label],
          gene_label: associatedGene.gene_label,
          transcript_label: transcript_label,
          transcript_version: transcript_version,
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

// TODO: change this
Moko.ensureIndex(IsoformExpression, {
  study_label: 1,
  collaborations: 1,
  gene_label: 1,
  transcript_label: 1,
  transcript_version: 1,
  sample_label: 1,
});

WranglerFileTypes.RectangularIsoformExpression = RectangularIsoformExpression;
