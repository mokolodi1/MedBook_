Studies = new Meteor.Collection("studies");

Studies.attachSchema(new SimpleSchema({
  administrators: { type: [String] },
  collaborations: { type: [String] },

  name: { type: String },
  description: { type: String },

  study_label: { type: String, regEx: labelRegex },
  sample_labels: { type: [String] },
}));
