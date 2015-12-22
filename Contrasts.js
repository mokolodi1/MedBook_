Contrasts = new Meteor.Collection('contrasts');

var sampleSchema = new SimpleSchema({
  study_label: { type: String },
  sample_label: { type: String },
  patient_label: { type: String, optional: true },
});

Contrasts.attachSchema(new SimpleSchema({
  user_id: { type: String },
  collaborations: { type: [String] },

  name: { type: String },
  description: { type: String },

  // TODO: ask Robert if I can change the names here
  first_name: { type: String }, // group1
  first_samples: { type: [sampleSchema] }, // list1
  second_name: { type: String }, // group2
  second_samples: { type: [sampleSchema] } // list2
}));
