Blobs = new Meteor.Collection("blobs")

Blobs.attachSchema(new SimpleSchema({
  // security/associated + object
  security_object: {
    type: new SimpleSchema({
      collection_name: {
        type: String,
        allowedValues: [
          // "Patients",
        ],
      },
      mongo_id: { type: String },
    }),
  },

  storage_path: { type: String }, // doesn't include _id folder

  // completed/finished/done + writing
  finished_writing: { type: Boolean, defaultValue: true },
}));
