// TODO: change this to accept options instead of wrangler_file_id
function RectangularGeneAnnotation (wrangler_file_id) {
  RectangularGeneAssay.call(this, wrangler_file_id);

  this.setSubmissionType.call(this, "gene_annotation");
}

RectangularGeneAnnotation.prototype =
    Object.create(RectangularGeneAssay.prototype);
RectangularGeneAnnotation.prototype.constructor = RectangularGeneAnnotation;

RectangularGeneAnnotation.prototype.alertIfSampleDataExists = function () {
  alertIfSampleDataExists.call(this,
      GeneAnnotation.simpleSchema().schema()
          [this.wranglerFile.options.annotation_type].label,
      function (sample_label) {
        var query = {
          sample_label: sample_label,
        };
        query[this.wranglerFile.options.annotation_type] = { $exists: true };

        // TODO: add index for findOne
        if (GeneAnnotation.findOne(query)) {
          return true;
        }
      });
};

RectangularGeneAnnotation.prototype.insertToCollection =
    function (gene_label, expressionStrings) {
  // insert into GeneAnnotation
  var bulk = GeneAnnotation.rawCollection().initializeUnorderedBulkOp();
  for (var index in expressionStrings) {
    var sample_label = this.sampleLabels[index];

    var setObject = {};
    setObject[this.wranglerFile.options.annotation_type] =
        parseFloat(expressionStrings[index]);

    // TODO: check on simpleschema (merge setObject, query)

    bulk.find({
      study_label: this.submission.options.study_label,
      collaborations: [this.submission.options.collaboration_label],
      gene_label: gene_label,
      sample_label: sample_label,
    }).upsert().updateOne({
      $set: setObject
    });
  }

  var deferred = Q.defer();
  bulk.execute(errorResultResolver(deferred));
  return deferred.promise;
};
Moko.ensureIndex(GeneAnnotation, {
  study_label: 1,
  collaborations: 1,
  gene_label: 1,
  sample_label: 1,
});

RectangularGeneAnnotation.prototype.endOfFile = function () {
  var dataType = GeneAnnotation.simpleSchema().schema()
      [this.wranglerFile.options.annotation_type].label;
  addExpressionSummaryDoc.call(this, dataType);
};

WranglerFileTypes.RectangularGeneAnnotation = RectangularGeneAnnotation;
