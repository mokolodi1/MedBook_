Meteor.publish("/collaborations/collaborations", function () {
  var collaborations =  [];
  if (this.userId) {
    collaborations = Meteor.users.findOne({_id: this.userId}).getAssociatedCollaborations();
  }

  if (!collaborations || collaborations.length === 0) {
    return Collaborations.find( {isUnlisted: false} );
  } else {
    return Collaborations.find({
      $or: [
        {isUnlisted: false}, // allows people to join
        {
          $and: [
	          {isUnlisted: true}, // here to show the true branch
	          {
              $or: [
		            {collaborators:  {$in: collaborations}},
		            {administrators: {$in: collaborations}},
	            ]
            }
          ]
        }
      ]
    });
  }
});

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
