// TODO: change this to accept options instead of wrangler_file_id
function SapleLabelDefinitions (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  // TODO: remove this (?)
  this.setSubmissionType.call(this, "metadata");
}

SapleLabelDefinitions.prototype = Object.create(TabSeperatedFile.prototype);
SapleLabelDefinitions.prototype.constructor = SapleLabelDefinitions;

SapleLabelDefinitions.prototype.parseLine = function (brokenTabs, lineNumber, line) {
  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  var sample_label = brokenTabs[0];

  if (lineNumber === 1) {
    if (!sample_label.match(/sample/i)) {
      throw 'First column header must contain "sample" (not case sensitive)';
    }

    this.study = Studies.findOne({id: this.wranglerFile.options.study_label});

    return;
  }

  if (this.study.Sample_IDs.indexOf(sample_label) === -1) {
    if (this.wranglerPeek) {
      this.insertWranglerDocument.call(this, {
        document_type: "new_sample_label",
        contents: {
          study_label: study.id,
          sample_label: sample_label,
        },
      });
    } else {
      Studies.update(this.study._id, {
        $addToSet: { Study_IDs: sample_label },
      });
    }
  }
};

WranglerFileTypes.SapleLabelDefinitions = SapleLabelDefinitions;
