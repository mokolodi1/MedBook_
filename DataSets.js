// studies migration script:
/*
db.getCollection('data_sets').update({}, {
  $unset: {short_name: 1, tables: 1, Patient_IDs: 1, id: 1},
  $rename: {Sample_IDs: "sample_labels"}
}, {multi: true})
*/

DataSets = new Meteor.Collection("data_sets");
DataSets.attachSchema(new SimpleSchema({
  collaborations: { type: [String] },

  name: { type: String },
  description: { type: String },

  // all valid sample labels
  // NOTE: each sample_label can only be linked with one patient.
  sample_labels: { type: [String], defaultValue: [] },

  // TODO: switch out
  gene_expression: { type: [String], defaultValue: [], optional: true },
  gene_expression_index: {
    type: Object,
    defaultValue: {},
    blackbox: true,
    optional: true,
  },
  gene_expression_genes: { type: [String], optional: true },
  gene_expression_wrangling: {
    type: Boolean,
    defaultValue: false,
    optional: true
  },
  // gene_expression: {
  //   type: new SimpleSchema({
  //     rsem_quan_log2: { type: [String] },
  //     rsem_quan_log2_index: { type: Object, blackbox: true, optional: true },
  //
  //     // all samples
  //     valid_genes: { type: [String], optional: true },
  //
  //     // whether someone is currently inserting data (soft lock)
  //     currently_wrangling: { type: Boolean, defaultValue: false },
  //   }),
  // },
}));
