Blobs = new Meteor.Collection("blobs")

Blobs.attachSchema(new SimpleSchema({
  // security/associated + object
  associated_object: {
    type: new SimpleSchema({
      collection_name: {
        type: String,
        // allowedValues: [
        //   // "Patients",
        // ],
      },
      mongo_id: { type: String },
    }),
  },

  // doesn't include file name, which is the `_id` of the document
  storage_path: { type: String },

  // completed/finished/done + writing
  finished_writing: { type: Boolean, defaultValue: false },
}));
