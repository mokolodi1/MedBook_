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

  var sample_label = brokenTabs[0];

  if (lineNumber === 1) {
    if (!sample_label.match(/sample/i)) {
      throw 'First column header must contain "sample" (not case sensitive)';
    }

    this.study = Studies.findOne({id: this.wranglerFile.options.study_label});

    return;
  }

  if (!this.study.SampleIDs ||
      this.study.Sample_IDs.indexOf(sample_label) === -1) {
    if (this.wranglerPeek) {
      this.insertWranglerDocument.call(this, {
        document_type: "new_sample_label",
        contents: {
          study_label: this.study.id,
          sample_label: sample_label,
        },
      });
    } else {
      Studies.update(this.study._id, {
        $addToSet: { Sample_IDs: sample_label },
      });

      // insert into CRFs... yuck yuck
      var crfDoc = {
        CRF: "Clinical_Info",
        Study_ID: this.study.id,
        Sample_ID: sample_label,
      };
      CRFs.upsert(crfDoc, { $set: crfDoc });
    }
  }
};

WranglerFileHandlers.SampleLabelDefinition = SampleLabelDefinition;
