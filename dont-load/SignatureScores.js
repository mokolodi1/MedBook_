SignatureScores = new Meteor.Collection("signature_scores");

SignatureScores.attachSchema(new SimpleSchema([
  Signatures.simpleSchema().pick([
    // label, version uniquely identify signature
    "signature_label",
    "signature_version",
    "signature_type",
    "signature_algorithm",
  ]),
  {
    study_label: { type: String },
    patient_label: { type: String, optional: true },
    sample_label: { type: String },
    value: { type: Number, decimal: true },
  }
]));
