// no transform on the client
Collaborations = new Meteor.Collection("collaborations");

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

Template.registerHelper("currentMedBookUser", function () {
  return MedBook.findUser(Meteor.userId());
});
