Samples = new Meteor.Collection("samples");

Samples.attachSchema(new SimpleSchema({
  study_label: { type: String },
  sample_label: { type: String },
  patient_label: { type: String },

  gene_expression_loaded: { type: Boolean, defaultValue: false },
  gene_expression_collaborations: {
    type: [String],
    optional: true,
    custom: function () {
      return requiredIfTrue.call(this,
          this.field("gene_expression_loaded").value);
    },
  },
}));
