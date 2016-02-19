_.mapObject = function (obj, func) {
  var newObject = {};
  for (var index in obj) {
    newObject[index] = func(obj[index], index, obj);
  }
  return newObject;
};

validateNumberStrings = function (strings) {
  for (var index in strings) {
    var valueString = strings[index];
    if (isNaN(valueString)) {
      throw "Non-numerical expression value: " + valueString;
    }
  }
};

errorResultResolver = function (deferred) {
  return function (error, result) {
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(result);
    }
  };
};

// Ensures all sample labels have a record in Clinical_Info and are also in
// the study. Also makes sure all Patient_IDs are in the study.
// TODO: add wrangler documents warning the user of inserting into
// both studies and Clinical_Info
ensureClinicalExists = function (Study_ID, Sample_ID) {
  var Patient_ID = Wrangler.wranglePatientLabel(Sample_ID);

  var clinical = {
    CRF: "Clinical_Info",
    Study_ID: Study_ID,
    Patient_ID: Patient_ID,
    Sample_ID: Sample_ID,
  };

  if (this.wranglerPeek) {
    var studiesQuery = {
      study_label: Study_ID,
      Sample_IDs: Sample_ID,
      Patient_IDs: Patient_ID,
    };

    // NOTE: this may require indexes
    if (!CRFs.findOne(clinical) || !Studies.findOne(studiesQuery)) {
      this.insertWranglerDocument.call(this, {
        document_type: "new_clinical_data",
        contents: {
          study_label: Study_ID,
          patient_label: Patient_ID,
          sample_label: Sample_ID,
        },
      });
    }
  } else {
    CRFs.upsert(clinical, {
      $set: clinical
    });

    Studies.update({
      study_label: Study_ID
    }, {
      $addToSet: {
        Sample_IDs: Sample_ID,
        Patient_IDs: Patient_ID,
      }
    });
  }
};

// adds a assay_sample_summary document, at the end of an expression file
addExpressionSummaryDoc = function (data_type) {
  if (this.wranglerPeek) {
    for (var index in this.sampleLabels) {
      var sample_label = this.sampleLabels[index];

      this.insertWranglerDocument.call(this, {
        document_type: "assay_sample_summary",
        contents: {
          sample_label: sample_label,
          data_type: data_type,
          line_count: this.line_count,
        }
      });
    }
  }
};

// check to see if collection already has data like this
// TODO: search for collaboration, study
// NOTE: currently any user can figure out if a certain
//       sample has gene_expression data.
alertIfSampleDataExists = function (data_type, checkDataExists) {
  if (this.wranglerPeek) {
    for (var index in this.sampleLabels) {
      sample_label = this.sampleLabels[index];

      if (checkDataExists.call(this, sample_label)) {
        this.insertWranglerDocument.call(this, {
          document_type: "sample_data_exists",
          contents: {
            file_name: this.blob.original.name,
            sample_label: sample_label,
            data_type: data_type,
          }
        });
      }
    }
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

// sets this.sampleLabels from a header line containing sample labels
setSampleLabels = function (brokenTabs) {
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
