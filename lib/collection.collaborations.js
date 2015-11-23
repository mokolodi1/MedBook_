/**
 * Represents a User
 * @class User
 * @param {Object} document An object representing a conversation ususally a Mongo document
 */


Collaborations = new Meteor.Collection("collaborations");


//Add the transform to the collection since Meteor.users is pre-defined by the accounts package
Collaborations._transform = function (document) {
  return new Collaboration(document);
};

Collaborations.isTrue = function (){
  return true;
};

Collaborations.allow({
  insert: function collaborationInsert (id, doc) {
    //console.log("collaborationControl", id, doc);
    return true;
  },
  update: function collaborationUpdate (id, doc) {
    return true;
    // if(this.userId){
    //   return true;
    // }
  },
  remove: function collaborationRemove (id, doc) {
    //console.log("collaborationControl", id, doc);
    return true;
  }
});


collaborationSchema = new SimpleSchema({
  _id: {
    type: String,
    optional: true
  },
  slug: {
    type: String,
    optional: true
  },
  isUnlisted: {
    type: Boolean
  },
  name: {
    type: String,
    optional: true,
    unique: true
  },
  description: {
    type: String,
    optional: true
  },
  collaborators: {
    type: [String]
  },
  administrators: {
    type: [String]
  },
  invitations: {
    type: [String],
    optional: true
  },
  requests: {
    type: [String],
    optional: true
  },
  requiresAdministratorApprovalToJoin: {
    type: Boolean
  }
});
Collaborations.attachSchema(collaborationSchema);


Schemas = { collaboration: collaborationSchema };

if (Meteor.isClient) {
  //Template.registerHelper("Schemas", function() { return Schemas});

  // refreshUserProfileCollaborations
  Collaborations.from = function (user) {
    if (user === null){
      return;
    }
    var emails = getEmailsFor(user);

    var collaborationLookupQueue = emails;
    var collaborationSet = {};

    // transitive closure queue method
    for (var i = 0; i < collaborationLookupQueue.length; i++) {
      var parent = collaborationLookupQueue[ i ];
      Collaborations.find ({collaborators: parent}, {fields: {name:1}}).forEach (function (col) {
        if (!(col.name in collaborationSet)) {
          collaborationSet[ col.name ] = col._id;
          collaborationLookupQueue.push(col.name);
        }
      });
    }

    var collaborations = Object.keys(collaborationSet).sort();
    var ret = Meteor.users.update( user._id, {$set: { "profile.collaborations": collaborations}});
    return collaborations;
  };

  // createCollaboration
  Collaborations.create = function (newCollaboration, callback) {
    console.log('Collaboration.create()');

    var slug = slugify(newCollaboration.name);
    newCollaboration.slug = slug;

    //Collaboration.addAdministrators(newCollaboration.administratorsString);
    //Collaboration.addCollaborators(newCollaboration.collaboratorsString);

    // console.log('newCollaboration', newCollaboration);
    //
    // // make sure each of the new entires on the collaboration security objects is trimmed
    // var securityDomains = ["collaborators", "administrators", "invitations", "applications"];
    // for (var i in securityDomains) {
    //   var domainName = securityDomains[ i ];
    //
    //   if (typeof(newCollaboration[ domainName ]) === "string"){
    //     newCollaboration[ domainName ] = newCollaboration[ domainName ].split(",").map( function (s) {
    //       return s.trim();
    //     }).filter( function (n){ return n.length > 0; });
    //   }
    // }
    //


    // // add user emails to the collaboration record
    // //var emailAddress = User.getEmails()[ 0 ];
    // var emailAddress = User.getPrimaryEmail();
    //
    // if (newCollaboration && newCollaboration.administrators && newCollaboration.administrators.indexOf(emailAddress) <= 0){
    //   newCollaboration.administrators.push(emailAddress);
    // };
    // if (newCollaboration && newCollaboration.collaborators  && newCollaboration.collaborators.indexOf(emailAddress) <= 0){
    //   newCollaboration.collaborators.push(emailAddress);
    // };

    console.log('newCollaboration', newCollaboration);

    // send the record to the server to be saved
    Meteor.call('collaboration/create',
      newCollaboration,
      function (error, result) {
        if (error) {
          console.log(error);
          Session.set('errorMessage', error);
        }
        if (result){
          console.log('collaboration/create[result]', result);
        }
      }
    );
  };


}



Collaborations.after.insert(function (userId, rawDocument) {
  //doc.createdAt = Date.now();

  var document = new Collaboration(rawDocument);

  // make sure User.collaborations are synced
  console.log('Collaborations.after.insert', document);
  if (document && document.collaborators) {

    document.collaborators.forEach(function (collaborator){
      // we use 0 instead of -1 because we don't want collaborations that begin with @
      if (collaborator.indexOf("@") > 0) {
        console.log('found a valid collaborator', collaborator);
        var user = Meteor.users.findOne({'emails.address' : collaborator});
        if (user) {
          console.log('found the matching user', user.username);

          console.log('lets try adding the document name', document.name);
          Meteor.users.update({_id: user._id}, {$addToSet:{
            'profile.collaborations': document._id
          }}, function (error, result){
            if (error) {
              console.log('error', error);
            }
          });
        }
      }
    });
  }

  console.log('Collaboration.name', document.name);
  console.log('Collaboration.getCollaborators()', document.getCollaborators());

  //
  // User.getAllCollaborations().forEach(function(collaboration){
  //
  // });


  // refreshUserProfileCollaborations = function (){
  //   User.getAllCollaborations().forEach(function(collaboration){
  //
  //   })
  // }


});
Collaborations.after.update(function (userId, doc) {
  //doc.createdAt = Date.now();
});
