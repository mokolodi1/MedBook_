// Publish logged-in user's collaborations so client-side checks can work.
// This is how alanning:roles does it, too.
Meteor.publish("/collaborations/user", function () {
  if (!this.userId) {
    this.ready();
    return;
  }

  return Meteor.users.find({_id: this.userId}, {
    fields: { collaborations: 1 }
  });
});




function getDefaultCollabs (user) {
  var email_address;
  if (user.emails) {
    email_address = user.emails[0].address;
  } else if (user.services && user.services.google) {
    email_address = user.services.google.email;
  } else {
    throw new Meteor.Error("Don't know where to find email.");
  }

  var personal = email_address;

  return {
    email_address: email_address,
    personal: personal,
    memberOf: [ personal ],
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
  var user = loginObj.user;
  var collabs = user.collaborations;
  // also check "email_address" and "personal" just in case
  if (!collabs || !collabs.email_address || !collabs.personal) {
    Meteor.users.update(user._id, {
      $set: {
        collaborations: getDefaultCollabs(user),
      }
    });
  }
});
