var blobStoreOptions = {};

if (Meteor.isServer) {
  // var mime = Npm.require("mime");

  blobStoreOptions = {
    beforeWrite: function (fileObject) {
      if (fileObject.metadata === undefined) {
        fileObject.metadata = {};
      }
      fileObject.metadata.uploaded_date = new Date();
    }
  };
}

BlobStore = new FS.Store.GridFS("blobs", blobStoreOptions);

Blobs = new FS.Collection("blobs", {
  stores: [BlobStore],
  // // TODO: include this? found in CRFs
  // chunkSize: 4 * 1024 * 1024
});

// users can only modify their own documents
Blobs.allow({
  insert: function (userId, doc) {
    // return userId === doc.metadata.user_id;
    return true;
  },
  update: function(userId, doc, fields, modifier) {
    // return userId === doc.metadata.user_id;
    return true;
  },
  remove: function (userId, doc) {
    // return userId === doc.metadata.user_id;
    return true;
  },
  // anyone can download a blob if they have the _id
  download: function (userId, doc) {
    return true;
    // return userId === doc.metadata.user_id;
  }
});
