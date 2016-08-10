Forms = new Meteor.Collection("forms");
Forms.attachSchema(new SimpleSchema({
  // administrators: { type: [String] },
  collaborations: { type: [String] },

  name: { type: String, label: "Name of form" },

  // which field has the sample_label
  sample_label_field: { type: String },

  fields: recordFields([ "String", "Number", "Date" ]),

  // for quick look-up
  sample_labels: {
    type: [String],
  },
}));
