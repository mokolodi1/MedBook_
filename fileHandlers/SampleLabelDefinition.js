// TODO: change this to accept options instead of wrangler_file_id
function SampleLabelDefinition (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  // TODO: remove this (?)
  this.setSubmissionType.call(this, "metadata");
}

SampleLabelDefinition.prototype = Object.create(TabSeperatedFile.prototype);
SampleLabelDefinition.prototype.constructor = SampleLabelDefinition;

SampleLabelDefinition.prototype.parseLine = function (brokenTabs, lineNumber, line) {
  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  if (lineNumber === 1) {
    this.study = Studies.findOne(this.wranglerFile.options.study_id);

    this.newSampleLabels = [];
    this.existingSampleLabels = [];
  }

  var sample_label = this.study.study_label + "/" + brokenTabs[0];

  if (this.study.sample_labels.indexOf(sample_label) === -1) {
    this.newSampleLabels.push(sample_label);
  } else {
    this.existingSampleLabels.push(sample_label);
  }
};

SampleLabelDefinition.prototype.endOfFile = function () {
  if (this.wranglerPeek) {
    this.insertWranglerDocument.call(this, {
      document_type: "sample_label_definition",
      contents: {
        study_name: this.study.name,
        new_sample_label_count: this.newSampleLabels.length,
        existing_sample_label_count: this.existingSampleLabels.length,
      }
    });
  } else {
    Studies.update(this.wranglerFile.options.study_id, {
      $addToSet: {
        sample_labels: {
          $each: this.newSampleLabels
        }
      }
    });
  }
};

WranglerFileHandlers.SampleLabelDefinition = SampleLabelDefinition;
