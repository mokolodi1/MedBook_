Networks = new Meteor.Collection("networks");
NetworkElements = new Meteor.Collection("network_elements");
NetworkInteractions = new Meteor.Collection("network_interactions");

Networks.attachSchema(new SimpleSchema({
  study_label: { type: String, optional: true },
  collaborations: { type: [String] },
  name: { type: String },
  version: { type: Number },
  date_created: {
    type: Date,
    // https://github.com/aldeed/meteor-collection2#autovalue
    autoValue: function() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return { $setOnInsert: new Date() };
      } else {
        this.unset();  // Prevent user from supplying their own value
      }
    },
  },

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
