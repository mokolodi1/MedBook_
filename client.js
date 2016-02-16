// no transform on the client
Collaborations = new Meteor.Collection("collaboration");

// We need this so that we get the extra fields in the user objects
Tracker.autorun(function () {
  // include Meteor.userId() so that it is reactive on the client
  var userId = Meteor.userId();

  if (userId) {
    Meteor.subscribe("/collaborations/user", userId);
  }
});

// These functions are client-only versions of those on the server.
// They grant the client permission to just about everything.

hasAccess = function (objOrName) {
  return true; // lol
};

getCollaborations = function () {
  return this.collaborations.memberOf;
};
