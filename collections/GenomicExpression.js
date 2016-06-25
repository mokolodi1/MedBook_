GenomicExpression = new Meteor.Collection("genomic_expression");
GenomicExpression.attachSchema(new SimpleSchema({
  data_set_id: { type: String },
  feature_label: { type: String },

  // matches with sample_labels in the data set
  values: {
    type: [Number],
    decimal: true,
  },
}));
