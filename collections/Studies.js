Studies = new Meteor.Collection("studies");

SimpleSchema.messages({
  "studyLabelNotUnique": "Sample label is taken",
});

Studies.attachSchema(new SimpleSchema({
  // administrators: { type: [String] },
  collaborations: { type: [String] },

  name: { type: String },
  description: { type: String },

  study_label: {
    type: String,
    regEx: MedBook.studyLabelRegex,
  },
  sample_labels: {
    type: [String],
    regEx: MedBook.sampleLabelRegex,
    defaultValue: [],
  },
}));
