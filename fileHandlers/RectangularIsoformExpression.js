// TODO: change this to accept options instead of wrangler_file_id
function RectangularIsoformExpression (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id,
  });

  loadTranscriptMapping.call(this);
  this.setSubmissionType.call(this, 'isoform_expression');
}

RectangularIsoformExpression.prototype =
    Object.create(TabSeperatedFile.prototype);
RectangularIsoformExpression.prototype.constructor = RectangularIsoformExpression;

function loadTranscriptMapping () {
  var self = this;
  this.transcriptMapping = {};

  function addTranscriptMapping(transcriptLabel, geneObject) {
    self.transcriptMapping[transcriptLabel] = geneObject;
  }

  console.log("loading valid transcripts...");
  Genes.find({}, {
      fields: { gene_label: 1, transcripts: 1 }
    }).forEach(function (doc) {
      _.each(doc.transcripts, function (transcript) {
        self.transcriptMapping[transcript.label] = doc;
      });
    });
  console.log("done loading valid transcripts");
}


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
          IsoformExpression.simpleSchema().schema()
              ['values.' + this.wranglerFile.options.normalization].label,
          function (sample_label) {
            var query = {
              sample_label: sample_label,
            };
            query["values." + this.wranglerFile.options.normalization] = { $exists: true };

            // TODO: add index for findOne
            if (IsoformExpression.findOne(query)) {
              return true;
            }
          });
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

RectangularIsoformExpression.prototype.endOfFile = function () {
  var dataType = IsoformExpression.simpleSchema().schema()
      ['values.' + this.wranglerFile.options.normalization].label;
  addExpressionSummaryDoc.call(this, dataType);
};

WranglerFileHandlers.RectangularIsoformExpression = RectangularIsoformExpression;
