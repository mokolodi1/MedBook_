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

// calculate allowedValues for training_normalization
var schema = GeneExpression.simpleSchema().schema();
var normalizationKeys = _.filter(Object.keys(schema),
    function (value) {
  // check if it has 'values.' at the beginning
  return value.slice(0, 7) === 'values.';
});
var allowedValues = _.map(normalizationKeys, function (value) {
  // 'values.raw_counts' ==> 'raw_counts'
  return value.slice(7);
});
var options = _.map(allowedValues, function (normalization) {
  return {
    value: normalization,
    label: schema['values.' + normalization].label,
  };
});
var training_normalization = {
  type: String,
  allowedValues: allowedValues,
  autoform: {
    options: options,
  },
  optional: true,
};

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

  training_normalization: training_normalization,

  // NOTE: dense/sparse weights stored as seperate signatures?
  gene_weights: { type: [geneValuePair], optional: true },
  // dense_weights: { type: [geneValuePair], optional: true },
  // sparse_weights: { type: [geneValuePair], optional: true },
}));
