Meteor.publish("listSubmissions", function () {
  return WranglerSubmissions.find({
    "user_id": this.userId,
  });
});

Meteor.publish("wranglerSubmission", function (submissionId) {
  check(submissionId, String);

  // ensure submission exists...
  var submission = WranglerSubmissions.findOne(submissionId);
  if (submission && submission.user_id === this.userId) {
    return WranglerSubmissions.find(submissionId);
  } else {
    this.ready();
  }
});

// TODO: is this used anywhere?
Meteor.publish("documentsForSubmission", function (submissionId) {
  check(submissionId, String);

  var submission = WranglerSubmissions.findOne(submissionId);
  if (submission && submission.user_id === this.userId) {
    // don't publish prospective_document
    return WranglerDocuments.find({
          "submission_id": submissionId
        }, {
          fields: { "prospective_document": 0 }
        });
  } else {
    this.ready();
  }
});

Meteor.publish("documentsForCollection", function (submissionId, collectionName) {
  check(submissionId, String);
  check(collectionName, String);

  var submission = WranglerSubmissions.findOne(submissionId);
  if (submission && submission.user_id === this.userId) {
    return WranglerDocuments.find({
      "submission_id": submissionId,
      "collection_name": collectionName,
    });
  } else {
    this.ready();
  }
});

Meteor.publish("superpathways", function () {
  return Superpathways.find({});
});

ReactiveTable.publish("reviewObjectsForCollection", WranglerDocuments,
    function (submissionId, collectionName) {
      console.log("reviewObjectsForCollection publish:",
          submissionId, collectionName);
      check([submissionId, collectionName], [String]);

      return {
        "submission_id": submissionId,
        "collection_name": collectionName,
      };
    }
);
