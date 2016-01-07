_.mapObject = function (obj, func) {
  var newObject = {};
  for (var index in obj) {
    newObject[index] = func(obj[index], index, obj);
  }
  return newObject;
};

Expression2Insert = function(gene, sampleLabels, expressionStrings) {
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
};

Moko.ensureIndex(Expression2, {
  gene: 1,
  Study_ID: 1,
  Collaborations: 1,
});

getNormalizationLabel = function (collection, slug) {
  return collection.simpleSchema().schema()['values.' + slug].label;
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
  console.log("Study_ID, Sample_ID:", Study_ID, Sample_ID);
  var Patient_ID = Wrangler.wranglePatientLabel(Sample_ID);

  var clinical = {
    CRF: "Clinical_Info",
    Study_ID: Study_ID,
    Patient_ID: Patient_ID,
    Sample_ID: Sample_ID,
  };

  if (this.wranglerPeek) {
    var studiesQuery = {
      id: Study_ID,
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
      id: Study_ID
    }, {
      $addToSet: {
        Sample_IDs: Sample_ID,
        Patient_IDs: Patient_ID,
      }
    });
  }
};
