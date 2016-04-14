var blobStoreOptions = {};

if (Meteor.isServer) {
  // var mime = Npm.require("mime");

  blobStoreOptions = {
    beforeWrite: function (fileObject) {
      if (fileObject.metadata === undefined) {
        fileObject.metadata = {};
      }
      fileObject.metadata.uploaded_date = new Date();

      // if (fileObject.original.type == "") {
      //   var name = fileObject.name();
      //   var type;
      //
      //   if (name.match(/\.tab$/)) {
      //     type = 'text/tab-separated-values';
      //   } else {
      //     type = mime.lookup(name);
      //   }
      //
      //   fileObject.type(type);
      // }
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
    return userId === doc.metadata.user_id;
  },
  update: function(userId, doc, fields, modifier) {
    return userId === doc.metadata.user_id;
  },
  remove: function (userId, doc) {
    return userId === doc.metadata.user_id;
  },
  download: function (userId, doc) {
    return userId === doc.metadata.user_id;
  }
});
