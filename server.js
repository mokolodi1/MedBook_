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
        collaborations: getDefaultCollabs(loginObj.user),
      }
    });
  }
});
