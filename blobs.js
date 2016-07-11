fs = Npm.require("fs");
path = Npm.require("path");
mv = Npm.require("mv");
mime = Npm.require("mime-types");

function getFilePath (doc) {
  var rootPath = Blobs2._configOptions.storageRootPath;

  return path.join(rootPath, doc.storage_path);
}

Blobs2 = new Meteor.Collection("blobs", {
  transform: function (doc) {
    doc.getFilePath = _.partial(getFilePath, doc);

    return doc;
  }
});

Blobs2.attachSchema(new SimpleSchema({
  // original file name
  file_name: { type: String },
  mime_type: { type: String },

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

  // includes the file name, which is the `_id` of the document
  storage_path: { type: String, optional: true },
}));

var storageRootPath = "/filestore";
if (process.env.MEDBOOK_FILESTORE) {
  storageRootPath = process.env.MEDBOOK_FILESTORE;
  console.log("storageRootPath:", storageRootPath);
}

Blobs2._configOptions = {
  storageRootPath: storageRootPath
};

Blobs2.create = function (pathOnServer, associated_object, callback) {
  check(pathOnServer, String);
  check(associated_object, new SimpleSchema({
    collection_name: { type: String },
    mongo_id: { type: String },
  }));
  if (typeof callback !== "function") throw new Meteor.Error("no-callback");

  // create the blob
  // NOTE: don't set associated_object until it's actually done so if there's
  // an error somewhere along the line it's cleaned up
  var file_name = path.basename(pathOnServer);

  var blobId = Blobs2.insert({
    file_name: file_name,
    mime_type: mime.lookup(file_name),
  });

  // move the file to its new home
  var rootPath = Blobs2._configOptions.storageRootPath;
  var storage_path = path.join(blobId.slice(0, 2), blobId.slice(2, 4), blobId);

  // only throw an error if the problem is something other than the folder
  // already existing
  mv(pathOnServer, path.join(rootPath, storage_path), { mkdirp: true },
        Meteor.bindEnvironment(function (err, out) {
    if (err) {
      callback(err);
    } else {
      Blobs2.update(blobId, {
        $set: {
          associated_object: associated_object,
          storage_path: storage_path,
        }
      });

      callback(null, Blobs2.findOne(blobId));
    }
  }));
};
