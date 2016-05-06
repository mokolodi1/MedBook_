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

  id: { // TODO: change to study_label
    type: String,
    regEx: alphaNumeric,
    label: "Study ID",
  },
  name: { type: String },
  short_name: { type: String },
  description: { type: String, optional: true },

  tables: { type: [String] },

  // TODO: change to sample_labels
  Sample_IDs: { type: [String], defaultValue: [], optional: true },
  // TODO: remove (?)
  Patient_IDs: { type: [String], defaultValue: [], optional: true },
  patients: {
    type: [new SimpleSchema({
      patient_label: { type: String },
      sample_labels: { type: [String], optional: true, defaultValue: [] },
    })],
    optional: true,
  },

  gene_expression: { type: [String], optional: true },
  gene_expression_index: { type: Object, blackbox: true, optional: true },
  gene_expression_genes: { type: [String], optional: true },

  // whether someone is currently inserting data (soft lock)
  gene_expression_wrangling: {
    type: Boolean,
    defaultValue: false,
    optional: true
  },

  // TODO:
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
}));
