Studies = new Meteor.Collection("studies");

// regex for study_label that must be alphanumeric
var alphaNumeric = /^[a-zA-Z0-9_]*$/;
SimpleSchema.messages({
  regEx: [
    { exp: alphaNumeric, msg: "Must be alphanumeric" }
  ]
});

var samplesSchema = {
  type: [String],
  optional: true
};

Studies.attachSchema(new SimpleSchema({
  collaborations: { type: [String], min: 1 },

  id: {
    type: String,
    regEx: alphaNumeric,
    label: "Study ID",
  },
  name: { type: String },
  short_name: { type: String, max: 12 },
  description: { type: String },

  Sample_IDs: { type: [String], defaultValue: [] },
  PatientIDs: { type: [String], defaultValue: [] },

  gene_expression: { type: [String], optional: true },
  gene_expression_index: { type: Object, blackbox: true, optional: true },
  gene_expression_genes: { type: [String], optional: true },
  // gene_expression: {
  //   type: new SimpleSchema({
  //     samples: {
  //       type: new SimpleSchema({
  //         quantile_counts: { type: [String], optional: true },
  //         quantile_counts_log: { type: [String], optional: true },
  //         raw_counts: { type: [String], optional: true },
  //         tpm: { type: [String], optional: true },
  //         fpkm: { type: [String], optional: true },
  //       }),
  //       optional: true,
  //     },
  //     genes: {
  //       type: [String],
  //       custom: function () {
  //         var asdf = this.siblingField("samples").value;
  //         console.log("samples field:", asdf);
  //         return requiredIfTrue.call(this,
  //             !!this.siblingField("samples").value);
  //       },
  //     },
  //   }),
  //   optional: true,
  // },

  patients: {
    type: [new SimpleSchema({
      patient_label: { type: String },
      samples: { type: [String] }, // sample_labels
    })],
    optional: true,
  },
}));
