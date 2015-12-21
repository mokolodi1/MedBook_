RectangularGeneAssay = function (options) {
  TabSeperatedFile.call(this, options);
};

RectangularGeneAssay.prototype = Object.create(TabSeperatedFile.prototype);
RectangularGeneAssay.prototype.constructor = RectangularGeneAssay;

RectangularGeneAssay.prototype.loadGeneMapping = function () {
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
};

RectangularGeneAssay.prototype.loadTranscriptMapping = function () {
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
};

RectangularGeneAssay.prototype.verifyAtLeastTwoColumns = function (brokenTabs) {
  if (brokenTabs.length < 2) {
    throw "Expected 2+ column tab file, got " + brokenTabs.length +
        " column tab file";
  }
};

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

// sets this.sampleLabels
RectangularGeneAssay.prototype.setSampleLabels = function (brokenTabs) {
  var wrangledLabel;
  this.sampleLabels = [];
  for (var column = 1; column < brokenTabs.length; column++) {

    wrangledLabel = wrangleSampleThenUUID.call(this, brokenTabs[column]);

    // if it's a 2-column file, also check the file name for the sample label
    if (brokenTabs.length === 2 && !wrangledLabel) {
      wrangledLabel = wrangleSampleThenUUID.call(this, this.blob.original.name);
      if (!wrangledLabel) {
        throw "Could not parse sample label from header line or file name";
      }
    }

    if (!wrangledLabel) {
      throw "Could not parse sample label in column " + column;
    }
    this.sampleLabels.push(wrangledLabel);
  }
};

// Ensures all sample labels have a record in Clinical_Info and are also in
// the study. Also makes sure all Patient_IDs are in the study.
// TODO: add wrangler documents warning the user of inserting into
// both studies and Clinical_Info
RectangularGeneAssay.prototype.ensureClinicalExists = function () {
  if (!this.wranglerPeek) {
    var patientLabels = [];

    for (var index in this.sampleLabels) {
      var Sample_ID = this.sampleLabels[index];
      var Patient_ID = Wrangler.wranglePatientLabel(Sample_ID);

      var clinical = {
        CRF: "Clinical_Info",
        Study_ID: this.submission.options.study_label,
        Patient_ID: Patient_ID,
        Sample_ID: Sample_ID,
      };

      CRFs.upsert(clinical, {
        $set: clinical
      });

      patientLabels.push(Patient_ID);
    }

    Studies.update({
      id: this.submission.options.study_label
    }, {
      $addToSet: {
        Sample_IDs: {
          $each: this.sampleLabels
        },
        Patient_IDs: {
          $each: patientLabels
        }
      }
    });
  }
};

RectangularGeneAssay.prototype.checkDataExists = function (sample_label) {
  throw "checkDataExists function not overridden";
};

// TODO: search for collaboration, study
// NOTE: currently any user can figure out if a certain
//       sample has gene_expression data.
// NOTE: only should be run when this.wranglerPeek true
RectangularGeneAssay.prototype.alertDataExists = function () {
  var normalization = this.wranglerFile.options.normalization;
  var normalizationLabel = this.getNormalizationLabel(normalization);
  for (var index in this.sampleLabels) {
    sample_label = this.sampleLabels[index];

    if (this.checkDataExists.call(this, sample_label)) {
      this.insertWranglerDocument.call(this, {
        document_type: "expression_data_exists",
        contents: {
          file_name: this.blob.original.name,
          sample_label: sample_label,
          normalization: normalizationLabel,
        }
      });
    }
  }
};

// map a gene label into HUGO namespace
RectangularGeneAssay.prototype.mapGeneLabel = function (originalGeneLabel) {
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
};

RectangularGeneAssay.prototype.endOfFile = function () {
  if (this.wranglerPeek) {
    var normalization = this.wranglerFile.options.normalization;
    var normalization_description = this.getNormalizationLabel(normalization);

    for (var index in this.sampleLabels) {
      var sample_label = this.sampleLabels[index];

      this.insertWranglerDocument.call(this, {
        document_type: "sample_normalization",
        contents: {
          sample_label: sample_label,
          normalization_description: normalization_description,
          line_count: this.line_count,
        }
      });
    }
  }
};
