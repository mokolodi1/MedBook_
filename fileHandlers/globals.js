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
      deferred.resolve({});
    }
  };
};

// adds a assay_sample_summary document, at the end of an expression file
addExpressionSummaryDoc = function (data_type) {
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
};

// check to see if collection already has data like this
// TODO: search for collaboration, study
// NOTE: currently any user can figure out if a certain
//       sample has gene_expression data.
alertIfSampleDataExists = function (data_type, checkDataExists) {
  for (var index in this.sampleLabels) {
    sample_label = this.sampleLabels[index];

    if (checkDataExists.call(this, sample_label)) {
      if (this.wranglerPeek) {
        this.insertWranglerDocument.call(this, {
          document_type: "sample_data_exists",
          contents: {
            file_name: this.blob.original.name,
            sample_label: sample_label,
            data_type: data_type,
          }
        });
      } else {
        throw "Some data already exists in the database.";
      }
    }
  }
};

// sets this.sampleLabels from a header line containing sample labels
setSampleLabels = function (brokenTabs) {
  var dataSet = DataSets.findOne(this.wranglerFile.options.data_set_id);

  this.sampleLabels = [];
  for (var column = 1; column < brokenTabs.length; column++) {
    var sample_label = brokenTabs[column];

    if (dataSet.sample_labels.indexOf(sample_label) === -1) {
      throw "Sample " + sample_label + " not defined in data set.";
    }

    this.sampleLabels.push(sample_label);
  }
};
