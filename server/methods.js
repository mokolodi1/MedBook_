


Meteor.methods({
  // collaboration/create
  'collaboration/create': function ( collaboration ){
    process.env.DEBUG && console.log('collaboration/create', collaboration);

    if (this.userId) {
      collaboration.slug = slugify(collaboration.name);
      return Collaborations.insert(collaboration);
    } else {
      // throw new Meteor.Error(i18n.t('You need to login to add a new collaboration.'));
      // throw new Meteor.Error('You need to login to add a new collaboration.');
      throw new Meteor.Error(401, "You need to login to add a new collaboration.");
    }
  },
  // collaboration/join
  'collaboration/join': function ( collaborationId ) {
    process.env.DEBUG && console.log('collaboration/join', collaborationId);

    //var me = moi.call(this);

    var currentUser = Meteor.users.findOne({_id: this.userId});
    console.log("currentUser.isTrue", currentUser.isTrue());

    if (this.userId) {
      var activeCollaboration = Collaborations.find({_id: collaborationId });
      //if ( isAdminById(this.userId) || ! activeCollaboration.requiresAdministratorApprovalToJoin) {
      if ( activeCollaboration.requiresAdministratorApprovalToJoin) {
        throw new Meteor.Error(401, "You must have administrator approval to join this collaboration.");
      } else {
        Collaborations.update({_id: collaborationId }, { $addToSet: { collaborators: currentUser.defaultEmail() }}, function (error, result){
          if (result) {
            currentUser.syncCollaborations();
          }
        });
        //return refreshUserProfileCollaborations(Meteor.users.findOne({_id: this.userId}));
      }
    } else {
      throw new Meteor.Error(401, "User Not Logged In");
    }
  },
  // applyCollaborationMethod
  'collaboration/apply': function ( collaborationId ) {
    process.env.DEBUG && console.log('collaboration/apply', collaborationId);

    console.log('collaboration/apply');

    var user = Meteor.users.findOne({_id: this.userId});

    Collaborations.update({_id: collaborationId }, { $addToSet: {
      requests: user.getPrimaryEmail()
    }}, function (err, err2){

    });
  },
  // applyCollaborationMethod
  'collaboration/update': function ( collaboration ) {
    process.env.DEBUG && console.log('collaboration/update', collaboration);

    //var user = Meteor.users.findOne({_id: collaboration._id});

    return Collaborations.update({_id: collaboration._id }, { $set: {
      isUnlisted: collaboration.isUnlisted,
      name: collaboration.name,
      description: collaboration.description,
      collaborators: collaboration.collaborators,
      administrators: collaboration.administrators,
      invitations: collaboration.invitations,
      requests: collaboration.requests,
      requiresAdministratorApprovalToJoin: collaboration.requiresAdministratorApprovalToJoin
    }});
  },

    // collaboration/leave
  'collaboration/leave': function ( collaborationId ) {
    //var cols = moi.call(this);
    var currentUser = Meteor.users.findOne({_id: this.userId});
    Collaborations.update({_id: collaborationId }, { $pull: { collaborators: {$in: currentUser.getEmails()}, administrators: {$in: currentUser.getEmails() }}}, function (err, result){
      if (result) {
        currentUser.syncCollaborations();
      }
    });
    //refreshUserProfileCollaborations(Meteor.users.findOne({_id: this.userId}));
  }
});
