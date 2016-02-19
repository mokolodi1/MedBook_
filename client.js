// no transform on the client
Collaborations = new Meteor.Collection("collaborations");

// We need this so that we get the extra fields in the user objects
Tracker.autorun(function () {
  // include Meteor.userId() so that it is reactive on the client
  var userId = Meteor.userId();

  if (userId) {
    Meteor.subscribe("/collaborations/user", userId);
  }
});

// This is the client-side version of this function. The full definition and
// documentation are with the server-side version.
getCollaborations = function () {
  // if a user has just logged in user.collaborations is not necessarily
  // set just yet
  if (this.collaborations) {
    return this.collaborations.memberOf;
  } else {
    return [];
  }
};
