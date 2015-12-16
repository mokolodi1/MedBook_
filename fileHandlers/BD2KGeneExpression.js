// TODO: change this to accept options instead of wrangler_file_id
function BD2KGeneExpression (wrangler_file_id) {
  RectangularGeneAssay.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  this.setSubmissionType.call(this, 'gene_expression');
}

BD2KGeneExpression.prototype =
    Object.create(RectangularGeneAssay.prototype);
BD2KGeneExpression.prototype.constructor = BD2KGeneExpression;

function wrangleSampleUUID (text) {
  var mappingContents;
  var submissionIds = [];

  WranglerDocuments.find({
    user_id: this.wranglerFile.user_id,
    document_type: "sample_label_map",
  }).forEach(function (wranglerDoc) {
    // check if sample_uuid in text
    if (text.indexOf(wranglerDoc.contents.sample_uuid) >= 0) {
      if (mappingContents &&
          !_.isEqual(wranglerDoc.contents, mappingContents)) {
        throw "Two sample label mappings for same UUID: " +
            wranglerDoc.contents.sample_uuid;
      }

      submissionIds.push(wranglerDoc.submission_id);
      mappingContents = wranglerDoc.contents;
    }
  });

  if (mappingContents) {
    // only add it if it's not already in this submission
    if (submissionIds.indexOf(this.wranglerFile.submission_id) === -1) {
      // NOTE: the wrangler_file_id for this will not be the mapping file,
      // so it will be deleted when the file is deleted
      this.insertWranglerDocument.call(this, {
        document_type: "sample_label_map",
        contents: mappingContents,
      });
    }

    return mappingContents.sample_label;
  }
}

function wrangleSampleThenUUID (text) {
  var wrangledLabel = Wrangler.wrangleSampleLabel(text);

  if (!wrangledLabel) {
    wrangledLabel = wrangleSampleUUID.call(this, text);
  }

  return wrangledLabel;
}

BD2KGeneExpression.prototype.parseLine =
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

    var wrangledLabel;
    this.sampleLabels = new Array(brokenTabs.length - 1);
    for (var column = 1; column < brokenTabs.length; column++) {
      wrangledLabel = wrangleSampleThenUUID.call(this, brokenTabs[column]);
      if (!wrangledLabel) {
        throw "Could not parse sample label in column " + column;
      }
      this.sampleLabels[column - 1] = wrangledLabel;
    }

    // special case: look in the file name if it's a 2-column file
    if (brokenTabs.length === 2 && !this.sampleLabels[0]) {
      wrangledLabel = wrangleSampleThenUUID.call(this, this.blob.original.name);
      if (!wrangledLabel) {
        throw "Could not parse sample label from header line or file name";
      }
      this.sampleLabels[0] = wrangledLabel;
    }

    console.log("this.sampleLabels:", this.sampleLabels);

    // add the sample_labels to the studies table if necessary

    // TODO: add wrangler documents warning the user of this insertion
    if (!this.wranglerPeek) {
      Studies.update({
        id: this.submission.options.study_label
      }, {
        $addToSet: {
          Sample_IDs: {
            $each: this.sampleLabels
          }
        }
      });
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
          sample_label: this.sampleLabel,
        };
        query["values." + normalization] = { $exists: true };

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

    // map and insert into GeneExpression
    var originalGeneLabel = brokenTabs[0];
    var mappedGeneLabel = this.geneMapping[originalGeneLabel];

    // make sure the user knows we're ignoring/mapping the gene if applicable
    if (!mappedGeneLabel) {
      if (this.wranglerPeek) {
        this.insertWranglerDocument.call(this, {
          document_type: 'ignored_genes',
          contents: {
            gene: originalGeneLabel
          }
        });
      }
      return; // ignore the gene
    } else if (mappedGeneLabel !== originalGeneLabel) {
      if (this.wranglerPeek) {
        this.insertWranglerDocument.call(this, {
          document_type: 'mapped_genes',
          contents: {
            gene_in_file: originalGeneLabel,
            mapped_gene: mappedGeneLabel
          }
        });
      }
    }

    if (this.wranglerPeek) {
      this.gene_count++;
    } else {
      // insert into GeneExpression
      for (index in expressionStrings) {
        sample_label = this.sampleLabels[index];

        var setObject = {};
        setObject['values.' + this.wranglerFile.options.normalization] =
            parseFloat(expressionString);

        GeneExpression.upsert({
          study_label: this.submission.options.study_label,
          collaborations: [this.submission.options.collaboration_label],
          gene_label: mappedGeneLabel,
          sample_label: sample_label,
          baseline_progression: this.baseline_progression,
        }, {
          $set: setObject
        });
      }
    }
  }
};

BD2KGeneExpression.prototype.endOfFile = function () {
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

WranglerFileTypes.BD2KGeneExpression = BD2KGeneExpression;

Moko.ensureIndex(GeneExpression, {
  study_label: 1,
  collaborations: 1,
  gene_label: 1,
  sample_label: 1,
  baseline_progression: 1,
});
