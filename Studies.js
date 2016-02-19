Studies = new Meteor.Collection("studies");

var alphaNumeric = /^[a-zA-Z0-9_]*$/;

SimpleSchema.messages({
  regEx: [
    { exp: alphaNumeric, msg: "Must be alphanumeric" }
  ]
})

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
}));
