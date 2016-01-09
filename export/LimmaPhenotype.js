function LimmaPhenotype (destination, options) {
  return BaseExporter.call(this, destination, options);
}
LimmaPhenotype.prototype = Object.create(BaseExporter.prototype);
LimmaPhenotype.prototype.constructor = LimmaPhenotype;

LimmaPhenotype.prototype.init = function (options) {
  checkOptions(options, new SimpleSchema({
    contrastId: { type: String }
  }));

  var self = this;

  var contrast = Contrasts.findOne(options.contrastId);
  if (!contrast) {
    throw "invalid contrast";
  }

  var sampleLabels = []; // to check for uniqueness of sample labels
  self.phenotypes = [];

  function addPhenotypes (groupName, samples) {
    for (var index in samples) {
      var sampleLabel = samples[index].sample_label;

      sampleLabels.push(sampleLabel);
      self.phenotypes.push({
        groupName: groupName,
        sampleLabel: sampleLabel
      });
    }
  }

  addPhenotypes(contrast.a_name, contrast.a_samples);
  addPhenotypes(contrast.b_name, contrast.b_samples);

  // make sure there are no duplicate sample labels
  sampleLabels.sort();
  var uniqueSampleLabels = _.uniq(sampleLabels, true);
  if (sampleLabels.length !== uniqueSampleLabels.length) {
    throw "sample labels not unique in contrast";
  }
};

LimmaPhenotype.prototype.getLine = function (write, lineNumber) {
  if (lineNumber === 1) {
    write("sample\tgroup");
  } else {
    var phenotype = this.phenotypes[lineNumber - 2];
    if (phenotype) {
      write(phenotype.sampleLabel);
      write("\t");
      write(phenotype.groupName);
    }
  }
};

Export.LimmaPhenotype = LimmaPhenotype;
