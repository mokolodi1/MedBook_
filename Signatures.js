Signatures = new Meteor.Collection("signatures");

var featureValuePair = new SimpleSchema({
  feature_label: { type: String },
  value: { type: Number, decimal: true },
  p_value: { type: Number, decimal: true, optional: true },
  false_discovery_rate: { type: Number, decimal: true, optional: true }
});

var sampleSchema = new SimpleSchema({
  study_label: { type: String },
  sample_label: { type: String },
  patient_label: { type: String, optional: true },
});

// calculate allowedValues for training_normalization
// NOTE/TODO: we can't just pull this from the field in Wrangler because
// quantile_counts_log needs to be an option (or does it?)
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
  collaborations: { type: [String] },

  // label, version uniquely identify signature
  signature_label: { type: String }, // ex. "ABL1_kinase_viper_v4"
  signature_version: { type: Number, min: 1 },

  description: { type: String }, // "KEAP1 non-silent mutation"

  algorithm: {
    type: String,
    allowedValues: [
      "limma",
      "viper"
    ],
  },

  // NOTE: dense/sparse weights stored as seperate signatures
  features: { type: [featureValuePair], optional: true },
  features_type: { // the type for features.$.feature_label
    type: String,
    allowedValues: [
      "genes",
      "isoforms",
    ],
  },

  // from Robert's email
  // there are two different ideas here:
  // 1) data type: type of data used in the dot product - see my list below
  // 2) clinical feature type: type of clinical variable that the signature is trained on - drug, mutation, disease state.

  // // this is for linking to more information about a gene or drug
  // link_label: { type: String, optional: true, }, // previously gene_label
  // link_type: {
  //   type: String,
  //   optional: true,
  //   allowedValues: [
  //     "gene"
  //   ]
  // },
  //
  // // for use in gene_expression type
  // training_normalization: training_normalization,
  //
  // upper_name: { type: String, optional: true },
  // // TODO: does limma give thresholds
  // upper_threshold: { type: String, optional: true },
  // upper_training_samples: { type: [sampleSchema], optional: true },
  //
  // lower_name: { type: String, optional: true },
  // lower_threshold: { type: String, optional: true },
  // lower_training_samples: { type: [sampleSchema], optional: true },

  // // refers to the collection
  // type: {
  //   type: String,
  //   allowedValues: [
  //     "gene_expression",
  //     // "drug",
  //     // "mutation",
  //     // "other",
  //     "differential" // ??
  //   ],
  // },
}));
