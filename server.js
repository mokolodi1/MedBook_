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

// publish the users collection for use in the search users functionality
Meteor.publish("/collaborations/searchUsers", function (searchText) {
  check(searchText, String);

  return findUsersPersonalCollabs(searchText);
});



function ensureObjectAccess (user, singleObject, obj) {
  // if it's a collaboration, they have to be an admin to access
  if (singleObject.collectionString === "Collaborations") {
    user.ensureAdmin(obj);
  } else {
    user.ensureAccess(obj);
  }
}

// publish a single object with collaboration security
Meteor.publish("/collaborations/singleObject", function (singleObject) {
  check(singleObject, singleObjectSchema);

  var user = MedBook.ensureUser(this.userId);
  var collection = MedBook.Collections[singleObject.collectionString];
  var obj = collection.findOne(singleObject.objectId);
  ensureObjectAccess(user, singleObject, obj);

  return collection.find({
    _id: singleObject.objectId
  });
});




Meteor.methods({
  "/collaborations/pushCollaborator": function (singleObject, collabName) {
    check(singleObject, singleObjectSchema);
    check(collabName, String);

    var user = MedBook.ensureUser(this.userId);
    var collection = MedBook.Collections[singleObject.collectionString];
    var obj = collection.findOne(singleObject.objectId);
    ensureObjectAccess(user, singleObject, obj);

    // if not a personal collaboration, make sure we have access
    // NOTE: anyone can add data to anyone's personal collaboration
    // NOTE: can't remove collaborations you don't have access to
    if (!collabName.startsWith("user:")) {
      user.ensureAccess(collabName);
    }

    var pushObject = {};
    pushObject[singleObject.editingField] = collabName;
    collection.update(singleObject.objectId, {
      $push: pushObject,
    });
  },
  "/collaborations/pullCollaborator": function (singleObject, collabName) {
    check(singleObject, singleObjectSchema);
    check(collabName, String);

    var user = MedBook.ensureUser(this.userId);
    var collection = MedBook.Collections[singleObject.collectionString];
    var obj = collection.findOne(singleObject.objectId);
    ensureObjectAccess(user, singleObject, obj);

    // if not a personal collaboration, make sure we have access
    // NOTE: anyone can add data to anyone's personal collaboration
    // NOTE: can't remove collaborations you don't have access to
    if (!collabName.startsWith("user:")) {
      user.ensureAccess(collabName);
    }

    // Make sure they're not removing the last collaborator of the
    // list (this would in practice "delete") the object by making
    // it impossible to access.
    // Removing all from "collaborators" is okay because the admins can still
    // access the object.
    var currentCollabs = obj[singleObject.editingField];
    if (singleObject.editingField !== "collaborators" &&
        currentCollabs.length === 1 && currentCollabs[0] === collabName) {
      throw new Meteor.Error("no-collaborators-would-remain",
          "By removing the last collaborator, the object would become " +
          "impossible to access.");
    }

    // actually do the remove
    var pullObject = {};
    pullObject[singleObject.editingField] = collabName;
    collection.update(singleObject.objectId, {
      $pull: pullObject,
    });

    // remove if there's no collaborations left (except if it's Collaborations)
    // This is where to write collection-specific remove code.
    if (singleObject.collectionString === "Collaborations") {
      // do nothing
    } else {
      collection.remove({
        _id: singleObject.objectId,
        collaborations: { $size: 0 },
      });
    }
  },
});



function getDefaultCollabs (user) {
  var email_address = user.emails[0].address;
  var personal = "user:" + email_address;

  if (!email_address) {
    throw new Meteor.Error("Can't figure out email address from user obj");
  }

  return {
    email_address: email_address,
    personal: personal,
    memberOf: [personal],
  };
}

// Accounts.onCreateUser is called each time a user is created. This code
// ensures that user.collaborations is setup correctly.
Accounts.onCreateUser(function (options, user) {
  user.collaborations = getDefaultCollabs(user);

  // We still want the default hook's 'profile' behavior.
  if (options.profile) {
    user.profile = options.profile;
  }

  return user;
});

// make absolutely sure user.collaborations is set
Accounts.onLogin(function (loginObj) {
  var collabs = loginObj.user.collaborations;
  // also check "email_address" and "personal" just in case
  if (!collabs || !collabs.email_address || !collabs.personal) {
    Meteor.users.update(loginObj.user._id, {
      $set: {
        collaborations: getDefaultCollabs(user),
      }
    });
  }
});
