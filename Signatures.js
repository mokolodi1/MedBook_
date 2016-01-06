Signatures = new Meteor.Collection("signatures");

var geneValuePair = new SimpleSchema({
  gene_label: { type: String },
  value: { type: Number, decimal: true },
  p_value: { type: Number, decimal: true, optional: true },
  probability: { type: Number, decimal: true, optional: true }
});

var sampleSchema = new SimpleSchema({
  study_label: { type: String },
  sample_label: { type: String },
  patient_label: { type: String, optional: true },
});

Signatures.attachSchema(new SimpleSchema({
  user_id: { type: String },
  collaborations: { type: String },

  // label, version uniquely identify signature
  signature_label: { type: String }, // ex. "ABL1_kinase_viper_v4"
  signature_version: { type: Number, min: 1 },
  signature_type: {
    type: String,
    allowedValues: [
      "tf",
      "kinase",
      "drug",
      "mutation",
      "other",
    ],
  },
  signature_algorithm: {
    type: String,
    allowedValues: [
      "viper"
    ],
  },

  description: { type: String }, // "KEAP1 non-silent mutation"
  gene_label: { type: String, optional: true },

  // TODO: upper/lower ==> a/b ?
  upper_name: { type: String, optional: true },
  upper_threshold: { type: String, optional: true },
  upper_training_samples: { type: [sampleSchema], optional: true },

  lower_name: { type: String, optional: true },
  lower_threshold: { type: String, optional: true },
  lower_training_samples: { type: [sampleSchema], optional: true },

  // NOTE: dense/sparse weights stored as seperate signatures?
  gene_weights: { type: [geneValuePair], optional: true },
  // dense_weights: { type: [geneValuePair], optional: true },
  // sparse_weights: { type: [geneValuePair], optional: true },
}));
