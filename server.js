// Publish logged-in user's collaborations so client-side checks can work.
// This is how alanning:roles does it, too.
Meteor.publish("/collaborations/user", function (userId) {
  check(userId, String);

  // We don't technically need them to pass Meteor.userId(), but for now let's.
  // Also, this should really only be used in package code anyways...
  if (userId !== this.userId) {
    throw new Meteor.Error("Don't do that.");
  }

  if (!this.userId) {
    this.ready();
    return;
  }

  return Meteor.users.find({_id: this.userId}, {
    fields: { collaborations: 1 }
  });
});

// publish a single object with collaboration security
Meteor.publish("/collaborations/singleObject", function (singleObject) {
  check(singleObject, singleObjectSchema);

  var user = MedBook.ensureUser(this.userId);
  var collection = MedBook.Collections[singleObject.collectionString];
  var obj = collection.findOne(singleObject.objectId);
  user.ensureAccess(obj);

  return collection.find({
    _id: singleObject.objectId
  });
});

// publish the users collection
Meteor.publish("/collaborations/searchUsers", function (searchText) {
  check(searchText, String);

  return findUsersPersonalCollabs(searchText);
});

Meteor.methods({
  "/collaborations/addCollab": function (singleObject, collabName) {
    check(singleObject, singleObjectSchema);
    check(collabName, String);

    var user = MedBook.ensureUser(this.userId);
    var collection = MedBook.Collections[singleObject.collectionString];
    var obj = collection.findOne(singleObject.objectId);
    user.ensureAccess(obj);

    // if not a personal collaboration, make sure we have access
    // NOTE: anyone can add data to anyone's personal collaboration
    if (!collabName.startsWith("user:")) {
      user.ensureAccess(collabName);
    }

    collection.update(singleObject.objectId, {
      $push: {
        "collaborations": collabName
      }
    });
  },
  "/collaborations/removeCollab": function (singleObject, collabName) {
    check(singleObject, singleObjectSchema);
    check(collabName, String);

    var user = MedBook.ensureUser(this.userId);
    var collection = MedBook.Collections[singleObject.collectionString];
    var obj = collection.findOne(singleObject.objectId);
    user.ensureAccess(obj);

    // if not a personal collaboration, make sure we have access
    // NOTE: anyone can add data to anyone's personal collaboration
    // NOTE: can't remove collaborations you don't have access to
    if (!collabName.startsWith("user:")) {
      user.ensureAccess(collabName);
    }

    collection.update(singleObject.objectId, {
      $pull: {
        collaborations: collabName
      }
    });

    // remove if there's no collaborations left
    collection.remove({
      _id: singleObject.objectId,
      collaborations: { $size: 0 },
    });
  },
});

// Accounts.onCreateUser is called each time a user is created. This code
// ensures that user.collaborations is setup correctly.
Accounts.onCreateUser(function (options, user) {
  var email_address = user.emails[0].address;
  var personal = "user:" + email_address;

  if (!email_address) {
    throw new Meteor.Error("Can't figure out email address from user obj");
  }

  user.collaborations = {
    email_address: email_address,
    personal: personal,
    memberOf: [personal],
  };

  // We still want the default hook's 'profile' behavior.
  if (options.profile) {
    user.profile = options.profile;
  }

  console.log("user:", user);
  return user;
});
