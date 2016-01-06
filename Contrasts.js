Contrasts = new Meteor.Collection('contrasts');

var sampleSchema = new SimpleSchema({
  study_label: { type: String },
  sample_label: { type: String },
  patient_label: { type: String, optional: true },
});

Contrasts.attachSchema(new SimpleSchema({
  user_id: { type: String },
  collaborations: { type: [String] },

  label: { type: String },
  version: { type: Number, min: 1 },
  description: { type: String },

  a_name: { type: String }, // group1
  a_samples: { type: [sampleSchema] }, // list1
  b_name: { type: String }, // group2
  b_samples: { type: [sampleSchema] } // list2
}));

// a_name
// b_name
// a_samples
// b_samples
//
// first_name      group1
// first_samples   list1
// second_name     group2
// second_samples  list2
