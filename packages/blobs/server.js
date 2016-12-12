fs = Npm.require("fs");
path = Npm.require("path");
mv = Npm.require("mv");
mime = Npm.require("mime-types");
remove = Npm.require("remove");
Q = Npm.require("q");

var storageRootPath = "/filestore";
if (process.env.MEDBOOK_FILESTORE) {
  storageRootPath = process.env.MEDBOOK_FILESTORE;
}

console.log("blobs storage root path:", storageRootPath);

function getFilePath (doc) {
  return path.join(storageRootPath, doc.storage_path);
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

  // can put anything here
  metadata: { type: Object, blackbox: true, optional: true },
}));

Blobs2.create = function (pathOnServer, associated_object,
    metadata, callback) {
  check(pathOnServer, String);
  check(associated_object, new SimpleSchema({
    collection_name: { type: String },
    mongo_id: { type: String },
  }));
  check(metadata, Object);
  if (callback && typeof callback !== "function") {
    throw new Meteor.Error("invalid-callback");
  }

  // create the blob
  // NOTE: don't set associated_object until it's actually done so if there's
  // an error somewhere along the line it's cleaned up
  var file_name = path.basename(pathOnServer);

  var blobId = Blobs2.insert({
    file_name: file_name,
    mime_type: mime.lookup(file_name),
  });

  // move the file to its new home
  var storage_path = path.join(blobId.slice(0, 2), blobId.slice(2, 4), blobId);

  // only throw an error if the problem is something other than the folder
  // already existing
  var deferred = Q.defer();

  mv(pathOnServer, path.join(storageRootPath, storage_path), { mkdirp: true },
        Meteor.bindEnvironment(function (err, out) {
    if (err) {
      callback(err);
      deferred.reject(err);
    } else {
      Blobs2.update(blobId, {
        $set: {
          associated_object: associated_object,
          storage_path: storage_path,
          metadata: metadata,
        }
      });

      var blob = Blobs2.findOne(blobId);

      if (callback) callback(null, blob);
      deferred.resolve(blob);
    }
  }));
};

Blobs2.delete = function (selector, callback) {
  if (typeof selector === "string") {
    check(selector, String);
  } else {
    check(selector, Object);
  }
  if (callback && typeof callback !== "function") {
    throw new Meteor.Error("invalid-callback");
  }

  var rmPromises = [];
  var pathsToRemove = [];
  Blobs2.find(selector).forEach(function (blob) {
    var filePath = blob.getFilePath();

    pathsToRemove.push(filePath);
    rmPromises.push(Q.nfcall(remove, filePath));
  });

  // NOTE: anything attached to the returned promise will happen *after*
  // the .then and .catch here.
  return Q.allSettled(rmPromises)
    .then(Meteor.bindEnvironment(function(settledResult) {
      // remove the blobs from mongo
      // NOTE: This will happen even if some of the blobs failed to be
      // rm-ed for whatever reason. The fact that they are still sitting
      // around is an internal issue, and it's not one that the client code
      // should have to deal with.
      // Blobs2.remove(selector, { multi: true });
      Blobs2.remove(selector);

      console.log("selector:", selector);
      console.log("settledResult:", settledResult);

      // console.error("FAILED TO REMOVE SOME BLOBS FILES! (in Blobs2.delete)");
      // console.log("If you see this it means that something is very " +
      //     "wrong with the place MedBook stores files.");
      // console.log("selector:", selector);
      // console.log("asdf:", asdf);

      if (callback) {
        callback(null, rmPromises.length);
      }
    }))
    .catch(Meteor.bindEnvironment(function () {
      console.error("Had a problem dealing with allSettled in Blobs2.delete");
    }));
};
