// TODO: change this to accept options instead of wrangler_file_id
function BD2KSampleLabelMap (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  // TODO: remove this (?)
  this.setSubmissionType.call(this, 'gene_expression');
}

BD2KSampleLabelMap.prototype = Object.create(TabSeperatedFile.prototype);
BD2KSampleLabelMap.prototype.constructor = BD2KSampleLabelMap;

BD2KSampleLabelMap.prototype.parseLine = function (brokenTabs, lineNumber, line) {
  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  if (this.wranglerPeek) {
    if (lineNumber === 1) {
      this.sampleNameIndex = brokenTabs.indexOf("Sample_Name");
      if (this.sampleNameIndex === -1) {
        throw "Can't find column with header \"Sample_Name\"";
      }

      this.sampleNameUUID = brokenTabs.indexOf("Sample_UUID");
      if (this.sampleNameUUID === -1) {
        throw "Can't find column with header \"Sample_UUID\"";
      }
    } else {
      var original_sample_label = brokenTabs[this.sampleNameIndex];
      var sample_uuid = brokenTabs[this.sampleNameUUID];

      // some error checking
      if (!original_sample_label) {
        throw "No column with header 'Sample_Name'";
      }
      if (!sample_uuid) {
        throw "No column with header 'Sample_UUID'";
      }

      this.insertWranglerDocument.call(this, {
        document_type: "sample_label_map",
        contents: {
          original_sample_label: original_sample_label,
          sample_label: Wrangler.wrangleSampleLabel(original_sample_label),
          sample_uuid: sample_uuid,
        },
      });
    }
  }
};

WranglerFileTypes.BD2KSampleLabelMap = BD2KSampleLabelMap;
