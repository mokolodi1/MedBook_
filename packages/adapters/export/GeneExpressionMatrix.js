function GeneExpressionMatrix (destination, options) {
  return BaseExporter.call(this, destination, options);
}
GeneExpressionMatrix.prototype = Object.create(BaseExporter.prototype);
GeneExpressionMatrix.prototype.constructor = GeneExpressionMatrix;

function sampleQueryArray () {
  var self = this;

  return _.map(self.samples, function (sample) {
    var query = {
      study_label: sample.study_label,
      sample_label: sample.sample_label,
    };
    query["values." + self.normalization] = { $exists: true };
    return query;
  });
}

GeneExpressionMatrix.prototype.init = function (options) {
  // make sure options okay

  // // pick training_normalization field, rename it to normalization
  // var normalization = Signatures.simpleSchema()
  //   .pick(["training_normalization"])
  //   .schema()
  //   .training_normalization;

  // NOTE: you should be able to pass in a normalization, but I've removed
  // it for now
  checkOptions(options, new SimpleSchema({
    samples: {
      type: [
        new SimpleSchema({
          study_label: { type: String },
          sample_label: { type: String },
          patient_label: { type: String, optional: true },
        })
      ]
    },
    // normalization: normalization,
  }));
  if (!options.normalization) {
    options.normalization = "quantile_counts";
  }

  // do stuff

  var self = this;
  self.samples = options.samples;

  // sort by study_label then sample_label
  self.samples.sort(function (first, second) {
    // sort based on study_label
    if (first.study_label < second.study_label) {
      return -1;
    } else if (first.study_label > second.study_label) {
      return 1;
    }

    // sort based on sample_label
    if (first.sample_label < second.sample_label) {
      return -1;
    } else if (first.sample_label > second.sample_label) {
      return 1;
    } else {
      throw "duplicate samples";
    }
  });

  // figure out which genes to use (that we have data for each sample for)
  // geneCounts.GENE = count of samples where that gene has a doc
  var geneCounts = {};

  // create an array of queries
  this.normalization = options.normalization;
  var orQuery = sampleQueryArray.call(this);
  GeneExpression.find({ $or: orQuery }).forEach(function (doc) {
    if (!geneCounts[doc.gene_label]) {
      geneCounts[doc.gene_label] = 1;
    } else {
      geneCounts[doc.gene_label]++;
    }
  });

  // find max of geneCounts, only keep genes that have that many samples
  var maxSamples = 0;
  _.each(geneCounts, function (count) {
    if (count > maxSamples) {
      maxSamples = count;
    }
  });

  self.geneLabels = [];
  _.each(geneCounts, function (count, geneLabel) {
    if (count === maxSamples) {
      self.geneLabels.push(geneLabel);
    }
  });
  self.geneLabels.sort();
};

function writeDataLine (write, gene_label) {
  // write gene
  write(gene_label);

  // write line contents by way of recursive callbacks
  var self = this;

  var orArray = sampleQueryArray.call(this);
  var projection = {
    study_label: 1,
    sample_label: 1,
  };
  projection["values." + self.normalization] = 1;

  var deferred = Q.defer();
  GeneExpression.rawCollection().find({
      $and: [
        {gene_label: gene_label},
        {$or: orArray}
      ]
    }, projection)
    .sort({
      study_label: 1,
      sample_label: 1,
    })
    .toArray(function (error, result) {
      if (error) {
        deferred.reject(error);
      }

      _.each(result, function (doc) {
        write("\t");
        write(doc.values[self.normalization]);
      });

      deferred.resolve();
    });
  return deferred.promise;
}

GeneExpressionMatrix.prototype.getLine = function (write, lineNumber) {
  if (lineNumber === 1) {
    write("gene");

    _.each(this.samples, function (sample) {
      write("\t");
      write(sample.sample_label);
    });
  } else {
    var geneIndex = lineNumber - 2;
    if (geneIndex < this.geneLabels.length) {
      return writeDataLine.call(this, write, this.geneLabels[geneIndex]);
    }
  }
};

Export.GeneExpressionMatrix = GeneExpressionMatrix;
