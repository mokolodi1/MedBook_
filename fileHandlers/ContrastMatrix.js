// TODO: change this to accept options instead of wrangler_file_id
function ContrastMatrix (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  this.setSubmissionType.call(this, 'contrast');
}

ContrastMatrix.prototype = Object.create(TabSeperatedFile.prototype);
ContrastMatrix.prototype.constructor = ContrastMatrix;

function ensureZeroOne (zeroOrOne) {
  return zeroOrOne === "1" || zeroOrOne === "0";
}

// returns "a" or "b", validates last two fields in brokenTabs
function getGroup (brokenTabs) {
  ensureZeroOne(brokenTabs[2]);
  ensureZeroOne(brokenTabs[3]);

  var samplesGroup;
  if (brokenTabs[2] === "1") {
    samplesGroup = "a";
  }

  if (brokenTabs[3] === "1") {
    if (samplesGroup) {
      throw "Sample " + brokenTabs[1] + " in study " + brokenTabs[0] +
          " can't be in both groups.";
    }
    samplesGroup = "b";
  }

  if (!samplesGroup) {
    throw "No group assignment for sample " + brokenTabs[1] + " in study " +
        brokenTabs[0] + ".";
  }

  return samplesGroup;
}

ContrastMatrix.prototype.parseLine =
    function (brokenTabs, lineNumber, line) {
  if (lineNumber % 1000 === 0) {
    console.log("lineNumber:", lineNumber);
  }

  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  if (lineNumber === 1) { // header line
    if (brokenTabs.length !== 4) {
      throw "Expected 4 column tab file, got " + brokenTabs.length +
          " column tab file";
    }

    var contrast_label = this.wranglerFile.options.contrast_label;
    var existingContrast = Contrasts.findOne({
      // TODO: what other criteria is there?
      contrast_label: contrast_label,
    }, {
      sort: { version: -1 }
    });
    var version = 1;
    var description;
    if (existingContrast) {
      version = existingContrast.version + 1;
      description = existingContrast.description;
    } else {
      description = this.wranglerFile.options.description;
    }

    this.newContrast = {
      user_id: this.wranglerFile.user_id,
      collaborations: [this.wranglerFile.options.collaboration_label],
      contrast_label: contrast_label,
      version: version,
      description: description,
      a_name: brokenTabs[2],
      a_samples: [],
      b_name: brokenTabs[3],
      b_samples: [],
    };
  } else { // rest of file
    var study_label = brokenTabs[0];

    // check studies to see if the collaboration has access
    var collaboration_label = this.wranglerFile.options.collaboration_label;
    var study = Studies.findOne({
      id: study_label,
      collaborations: collaboration_label,
    });
    if (!study) {
      throw "Collaboration " + collaboration_label + " does not have access " +
          "to study " + study_label + ".";
    }

    var sample_label = brokenTabs[1];
    ensureClinicalExists.call(this, study_label, sample_label);
    var patient_label = Wrangler.wranglePatientLabel(sample_label);

    var group = getGroup(brokenTabs);
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
          contrast_version: this.newContrast.version,
          study_label: study_label,
          sample_label: sample_label,
          group_name: this.newContrast[group + "_name"],
        },
      });
    }
  }
};

ContrastMatrix.prototype.endOfFile = function () {
  if (this.newContrast.a_samples.length === 0 ||
      this.newContrast.b_samples.length === 0) {
    throw "Each group must have at least one sample.";
  }

  if (this.wranglerPeek) {
    this.insertWranglerDocument.call(this, {
      document_type: "contrast_summary",
      contents: {
        contrast_label: this.newContrast.contrast_label,
        version: this.newContrast.version,
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
