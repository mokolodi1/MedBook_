GeneAnnotation = new Meteor.Collection("gene_annotation");

GeneAnnotation.attachSchema(new SimpleSchema({
  study_label: { type: String, optional: true },
  collaborations: { type: [String] },
  gene_label: { type: String },

  sample_label: { type: String },

  // TODO: maybe put all the annotations under an annotations attribute?
  gistic_copy_number: {
    type: Number, decimal: true,
    label: "GISTIC copy number",
    optional: true,
  },
}));
