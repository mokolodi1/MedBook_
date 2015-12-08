Networks = new Meteor.Collection("networks");
NetworkElements = new Meteor.Collection("network_elements");
NetworkInteractions = new Meteor.Collection("network_interactions");

Networks.attachSchema(new SimpleSchema({
  study_label: { type: String, optional: true },
  collaborations: { type: [String] },
  name: { type: String },
  version: { type: Number },

  type: {
    type: String,
    allowedValues: [
      "superpathway",
      "arachne_regulon",
    ]
  }
}));

NetworkElements.attachSchema(new SimpleSchema({
  network_id: { type: String },
  label: {
    type: String,
  },
  type: {
    type: String,
    allowedValues: [
      "gene",
      "protein",
      "complex",
      "abstract",
      "family",
      "miRNA",
      // "rna",
    ],
  },
}));

NetworkInteractions.attachSchema(new SimpleSchema({
  network_id: { type: String },
  source_label: { type: String },
  target_label: { type: String },
  interaction_type: {
    type: String,
    allowedValues: [
      "-t>",
      "-t|",
      "-a>",
      "-a|",
      "-phos>",
      "PPI>",
    ],
  },
  interaction_weight: {
    type: Number,
    decimal: true,
    optional: true,
  },
}));
