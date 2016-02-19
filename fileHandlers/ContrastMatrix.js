// TODO: change this to accept options instead of wrangler_file_id
function ContrastMatrix (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  this.setSubmissionType.call(this, 'contrast');
}

ContrastMatrix.prototype = Object.create(TabSeperatedFile.prototype);
ContrastMatrix.prototype.constructor = ContrastMatrix;

// returns "a" or "b", validates last two fields in brokenTabs
// also sets this.newContrast.a/b_name
function getGroup (brokenTabs) {
  var groupName = brokenTabs[2];

  if (!this.newContrast.a_name) {
    // must be group a because it's the first one
    this.newContrast.a_name = groupName;
    return "a";
  }
  if (groupName === this.newContrast.a_name) {
    return "a";
  }

  if (!this.newContrast.b_name) {
    // it's the second new name we've found, thus it must be group b
    this.newContrast.b_name = groupName;
    return "b";
  }
  if (groupName === this.newContrast.b_name) {
    return "b";
  }

  throw "Third group found: " + groupName + " for sample " + brokenTabs[1] +
      " in study " + brokenTabs[0] + ".";
}

ContrastMatrix.prototype.parseLine =
    function (brokenTabs, lineNumber, line) {
  if (lineNumber % 1000 === 0) {
    console.log("lineNumber:", lineNumber);
  }

  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  if (lineNumber === 1) { // header line
    if (brokenTabs.length !== 3) {
      throw "Expected 3 column tab file, got " + brokenTabs.length +
          " column tab file";
    }

    var contrast_label = this.wranglerFile.options.contrast_label;
    console.log("contrast_label:", contrast_label);
    var existingContrast = Contrasts.findOne({
      // TODO: what other criteria is there?
      contrast_label: contrast_label,
    }, { sort: { contrast_version: -1 } });
    var contrast_version = 1;
    var description;
    if (existingContrast) {
      // TODO: doesn't have test coverage
      if (this.wranglerFile.options.update_or_create === "create") {
        throw "Contrast with that name already exists";
      }

      contrast_version = existingContrast.contrast_version + 1;
      description = existingContrast.description;
    } else {
      description = this.wranglerFile.options.description;
    }

    this.newContrast = {
      collaborations: [this.wranglerFile.options.collaboration_label],
      contrast_label: contrast_label,
      contrast_version: contrast_version,
      description: description,
      // a/b_name set in getGroup
      a_samples: [],
      b_samples: [],
    };
  } else { // rest of file
    var study_label = brokenTabs[0];

    // check studies to see if the collaboration has access
    var collaboration_label = this.wranglerFile.options.collaboration_label;
    var study = Studies.findOne({
      study_label: study_label,
      collaborations: collaboration_label,
    });
    if (!study) {
      throw "Collaboration " + collaboration_label + " does not have access " +
          "to study " + study_label + ".";
    }

    var sample_label = brokenTabs[1];
    ensureClinicalExists.call(this, study_label, sample_label);
    var patient_label = Wrangler.wranglePatientLabel(sample_label);

    var group = getGroup.call(this, brokenTabs);
    this.newContrast[group + "_samples"].push({
      study_label: study_label,
      sample_label: sample_label,
      patient_label: patient_label,
    });

    if (this.wranglerPeek) {
      this.insertWranglerDocument({
        document_type: "contrast_sample",
        contents: {
          contrast_label: this.newContrast.contrast_label,
          contrast_version: this.newContrast.contrast_version,
          study_label: study_label,
          sample_label: sample_label,
          group_name: this.newContrast[group + "_name"],
        },
      });
    }
  }
};

ContrastMatrix.prototype.endOfFile = function () {
  if (!this.newContrast.a_name ||
      !this.newContrast.b_name) {
    throw "At least two groups must be defined in the file";
  }

  if (this.wranglerPeek) {
    this.insertWranglerDocument.call(this, {
      document_type: "contrast_summary",
      contents: {
        contrast_label: this.newContrast.contrast_label,
        contrast_version: this.newContrast.contrast_version,
        description: this.newContrast.description,
        a_name: this.newContrast.a_name,
        b_name: this.newContrast.b_name,
        a_samples_count: this.newContrast.a_samples.length,
        b_samples_count: this.newContrast.b_samples.length,
      },
    });
  } else {
    Contrasts.insert(this.newContrast);
  }
};

WranglerFileTypes.ContrastMatrix = ContrastMatrix;
