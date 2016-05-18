Samples = new Meteor.Collection("samples");

Samples.attachSchema(new SimpleSchema({
  data_set_id: { type: String },
  sample_label: { type: String },
  patient_label: { type: String },

  tumor_map_bookmarks: {
    type: new SimpleSchema({
      gene_expression: { type: String, optional: true },
      // copy_number: { type: String, optional: true },
      // mutations: { type: String, optional: true },
    }),
    optional: true,
  },
}));
