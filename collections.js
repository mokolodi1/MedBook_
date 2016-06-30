fs = Npm.require("fs");
path = Npm.require("path");

Blobs2 = new Meteor.Collection("blobs", {
  transform: function (doc) {
    doc.getFilePath = _.partial(getFilePath, doc);

    return doc;
  }
});

function getFilePath (doc) {
  var rootPath = Blobs2._configOptions.storageRootPath;

  return path.join(rootPath, doc.storage_path, doc._id);
}

Blobs2.attachSchema(new SimpleSchema({
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
    optional: true,
  },

  // doesn't include storage file name, which is the `_id` of the document
  storage_path: { type: String },

  // original file name
  file_name: { type: String },
}));

BlobMetadata = new Meteor.Collection("blob_metadata");

BlobMetadata.attachSchema(new SimpleSchema({
  folder_num: { type: Number },

  // only optional because of the insert transaction problem
  file_count: { type: Number, optional: true },
}));
