// We need this so that we get the extra fields in the user objects
Tracker.autorun(function () {
  // include Meteor.userId() so that it is reactive on the client
  Meteor.subscribe("/collaborations/user", Meteor.userId());
});
