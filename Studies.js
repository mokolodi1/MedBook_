Studies = new Meteor.Collection("studies");

// regex for study_label that must be alphanumeric
var alphaNumeric = /^[a-zA-Z0-9_]*$/;
SimpleSchema.messages({
  regEx: [
    { exp: alphaNumeric, msg: "Must be alphanumeric" }
  ]
});

var samplesSchema = new SimpleSchema({
  type: [String],
  optional: true
});

Studies.attachSchema(new SimpleSchema({
  collaborations: { type: [String], min: 1 },

  study_label: {
    type: String,
    regEx: alphaNumeric,
    label: "Study ID",
  },
  name: { type: String },
  short_name: { type: String, max: 12 },
  description: { type: String },

  Sample_IDs: { type: [String], defaultValue: [] },
  PatientIDs: { type: [String], defaultValue: [] },

  gene_expression_samples: {
    type: new SimpleSchema({
      quantile_counts: samplesSchema,
      quantile_counts_log: samplesSchema,
      raw_counts: samplesSchema,
      tpm: samplesSchema,
      fpkm: samplesSchema,
    }),
    optional: true,
  },

  patients: {
    type: [new SimpleSchema({
      samples: { type: [String] }, // sample_labels
    })],
    optional: true,
  },
}));
