Charts = new Meteor.Collection("charts");
Charts.attachSchema(new SimpleSchema({
  collaborations: { type: [String] },

  // NOTE: this can be set after creation like a Google doc
  name: { type: String, optional: true },

  date_created: { type: Date, autoValue: dateCreatedAutoValue },
  date_modified: { type: Date, autoValue: dateModifiedAutoValue },
}));
