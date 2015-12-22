Cohorts = new Meteor.Collection('cohorts');

var sampleSchema = new SimpleSchema({
  study_label: { type: String },
  sample_label: { type: String },
  patient_label: { type: String, optional: true },
  group: { type: Number, optional: true },
});

Cohorts.attachSchema(new SimpleSchema({
  user_id: { type: String },
  collaborations: { type: [String] },

  name: { type: String },
  description: { type: String },

  group_names: { type: [String], defaultValue: [] },
  samples: {
    type: [sampleSchema]
  },
}));
