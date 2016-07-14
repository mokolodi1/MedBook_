GenomicExpression = new Meteor.Collection("genomic_expression");
GenomicExpression.attachSchema(new SimpleSchema({
  data_set_id: { type: String },
  feature_label: { type: String },

  // indexes correspond with `sample_labels` in the data set
  values: {
    type: [Number],
    decimal: true,

    // optional because of SimpleSchema's upsert problem
    optional: true
  },
}));
