WranglerFileTypes = {};

FileHandler = function (options) {
  console.log("options:", options);

  // TODO: move these out of options and into functions
  if (options.wrangler_file_id) {
    this.wranglerFile = WranglerFiles.findOne(options.wrangler_file_id);
    if (!this.wranglerFile) {
      throw "Invalid wrangler_file_id";
    }

    this.blob = Blobs.findOne(this.wranglerFile.blob_id);
    if (!this.blob) {
      throw "Invalid blob_id";
    }

    this.submission = WranglerSubmissions
        .findOne(this.wranglerFile.submission_id);
    if (!this.submission) {
      throw "Invalid submission_id";
    }

    this.wranglerPeek = this.submission.status === "editing";

    // remove wrangler documents from the last peek
    if (this.wranglerPeek) {
      WranglerDocuments.update({
        submission_id: this.submission._id,
        wrangler_file_ids: options.wrangler_file_id,
      }, {
        $pull: { wrangler_file_ids: options.wrangler_file_id }
      }, {multi: true});
      WranglerDocuments.remove({
        submission_id: this.submission._id,
        wrangler_file_ids: {$size: 0},
      });
    }
  } else if (options.blob_id) {
    this.blob = Blobs.findOne(options.blob_id);
    if (!this.blob) {
      throw "Invalid blob_id";
    }

    // NOTE: this.wranglerPeek will be undefined, which should work
    // with the code to insert without being associated with Wrangler
  } else {
    throw "No options provided to FileHandler constructor";
  }
};

FileHandler.prototype.parse = function() {
  console.log("No parse method defined, ignoring...");
};

/*
** Fills in repetitive information shared for all WranglerDocuments added
** by this FileHandler and then inserts into WranglerDocuments.
*/
FileHandler.prototype.insertWranglerDocument = function (typeAndContents) {
  WranglerDocuments.upsert(_.extend({
    submission_id: this.blob.metadata.submission_id,
    user_id: this.blob.metadata.user_id,
  }, typeAndContents), {
    $addToSet: {
      wrangler_file_ids: this.wranglerFile._id,
    }
  });
};

Moko.ensureIndex(WranglerDocuments, {
  submission_id: 1,
  user_id: 1,
  document_type: 1,
  contents: 1,
});

FileHandler.prototype.blobAsString = function() {
  var self = this;
  return new Q.Promise(function (resolve, reject) {
    var blobText = "";
    var stream = self.blob.createReadStream("blobs")
      .on('data', function (chunk) {
        blobText += chunk;
      })
      .on('end', function () {
        resolve(blobText);
      });
  });
};

FileHandler.prototype.setSubmissionType = function (submission_type) {
  WranglerFiles.update(this.wranglerFile._id, {
    $set: {
      submission_type: submission_type
    }
  });
};
