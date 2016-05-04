Expression2 = new Meteor.Collection("expression2"); // NOTE: deprecated

var normalValue = {
  type: [Number],
  decimal: true,
  optional: true,
  min: 0,
};

var statsSchema = {
  type: new SimpleSchema({
    average: { type: Number },
    std_dev: { type: Number },
    // TODO: Ted
  }),
  optional: true,
};

Expression3 = new Meteor.Collection("expression3");
Expression3.attachSchema(new SimpleSchema({
  study_label: { type: String, optional: true },
  gene_label: { type: String },
  // NOTE: collaborations not stored at this level

  // different normalizations
  // quantile_counts: _.extend({
  //   label: "Quantile normalized counts",
  // }, normalValue),
  rsem_quan_log2: _.extend({
    label: "Quantile normalized counts log2(x+1)",
    max: 100,
    // // pulled from GeneExpression where it was just for one value
    // autoValue: function () {
    //   var quantileCounts = this.siblingField('quantile_counts');
    //   if (quantileCounts.isSet) {
    //     return Math.log(quantileCounts.value + 1) / Math.LN2;
    //   } else {
    //     this.unset();
    //   }
    // }
  }, normalValue),
  // raw_counts: _.extend({
  //   label: "Raw counts",
  // }, normalValue),
  // tpm: _.extend({
  //   label: "TPM (Transcripts Per Million)",
  // }, normalValue),
  // fpkm: _.extend({
  //   label: "RPKM (Reads Per Kilobase of transcript per Million mapped reads)",
  // }, normalValue),

  // stats: {
  //   type: new SimpleSchema({
  //     quantile_counts: statsSchema,
  //     quantile_counts_log: statsSchema,
  //     raw_counts: statsSchema,
  //     tpm: statsSchema,
  //     fpkm: statsSchema,
  //   }),
  //   optional: true,
  // },
}));
