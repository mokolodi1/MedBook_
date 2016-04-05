/**
 * @summary Collaborations object defines a Cursor of collaboration records.
 * @locus Anywhere
 * @memberOf Collaborations
 * @version 1.2.3
 * @class
 * @example
 * ```js
 * Collaborations = new Meteor.Collection("collaboration");
 * ```
 */
Collaborations = new Mongo.Collection("collaboration");

// Add the transform to the collection since Meteor.users is pre-defined by the accounts package
Collaborations._transform = function (doc) {
  return new Collaboration(doc);
};

// // NOTE: this would allow anyone to insert/remove
// Collaborations.allow({
//   insert: function collaborationInsert (id, doc) {
//     return true;
//   },
//   update: function collaborationUpdate (id, doc) {
//     return true;
//   },
//   remove: function collaborationRemove (id, doc) {
//     return true;
//   }
// });

Collaborations.attachSchema(new SimpleSchema({
  name: { type: String, unique: true },
  description: { type: String },

  collaborators: { type: [String] },
  administrators: { type: [String] },

  isUnlisted: { type: Boolean },
  invitations: { type: [String], optional: true },
  requests: { type: [String], optional: true },
  requiresAdministratorApprovalToJoin: { type: Boolean }
}));

// if (Meteor.isClient) {
//   // refreshUserProfileCollaborations
//   Collaborations.from = function (user) {
//     if (user === null){
//       return;
//     }
//     var emails = getEmailsFor(user);
//
//     var collaborationLookupQueue = emails;
//     var collaborationSet = {};
//
//     // transitive closure queue method
//     for (var i = 0; i < collaborationLookupQueue.length; i++) {
//       var parent = collaborationLookupQueue[ i ];
//       Collaborations.find ({collaborators: parent}, {fields: {name:1}}).forEach (function (col) {
//         if (!(col.name in collaborationSet)) {
//           collaborationSet[ col.name ] = col._id;
//           collaborationLookupQueue.push(col.name);
//         }
//       });
//     }
//
//     var collaborations = Object.keys(collaborationSet).sort();
//     var ret = Meteor.users.update( user._id, {$set: { "collaborations": collaborations}});
//     return collaborations;
//   };
//
//   /**
//    * @summary Creates a new collaboration.
//    * @locus Anywhere
//    * @memberOf Collaborations
//    * @name create
//    * @version 1.2.3
//    * @example
//    * ```js
//    * Collaborations.create({
//       name: "SampleCollab",
//       description: "Lorem ipsum...",
//       isUnlisted: false,
//       requiresAdministratorApproval: false,
//       collaborators: ['janedoe@test.org'],
//       administrators: ['janedoe@test.org'],
//       invitations: [],
//       requests: []
//     })
//    * ```
//    */
//
//   Collaborations.create = function (newCollaboration, callback) {
//     console.log('Collaboration.create()');
//
//     //Collaboration.addAdministrators(newCollaboration.administratorsString);
//     //Collaboration.addCollaborators(newCollaboration.collaboratorsString);
//
//     // console.log('newCollaboration', newCollaboration);
//     //
//     // // make sure each of the new entires on the collaboration security objects is trimmed
//     // var securityDomains = ["collaborators", "administrators", "invitations", "applications"];
//     // for (var i in securityDomains) {
//     //   var domainName = securityDomains[ i ];
//     //
//     //   if (typeof(newCollaboration[ domainName ]) === "string"){
//     //     newCollaboration[ domainName ] = newCollaboration[ domainName ].split(",").map( function (s) {
//     //       return s.trim();
//     //     }).filter( function (n){ return n.length > 0; });
//     //   }
//     // }
//     //
//
//
//     // // add user emails to the collaboration record
//     // //var emailAddress = User.getEmails()[ 0 ];
//     // var emailAddress = User.getPrimaryEmail();
//     //
//     // if (newCollaboration && newCollaboration.administrators && newCollaboration.administrators.indexOf(emailAddress) <= 0){
//     //   newCollaboration.administrators.push(emailAddress);
//     // };
//     // if (newCollaboration && newCollaboration.collaborators  && newCollaboration.collaborators.indexOf(emailAddress) <= 0){
//     //   newCollaboration.collaborators.push(emailAddress);
//     // };
//
//     console.log('newCollaboration', newCollaboration);
//
//     // send the record to the server to be saved
//     Meteor.call('collaboration/create',
//       newCollaboration,
//       function (error, result) {
//         if (error) {
//           console.log(error);
//           Session.set('errorMessage', error);
//         }
//         if (result){
//           console.log('collaboration/create[result]', result);
//         }
//       }
//     );
//   };
//
//
// }

// Collaborations.after.insert(function (userId, rawDocument) {
//   var doc = new Collaboration(rawDocument);
//
//   // make sure User.collaborations are synced
//   console.log('Collaborations.after.insert', doc);
//   if (doc && doc.collaborators) {
//
//     doc.collaborators.forEach(function (collaborator){
//       // we use 0 instead of -1 because we don't want collaborations that begin with @
//       if (collaborator.indexOf("@") > 0) {
//         console.log('found a valid collaborator', collaborator);
//         var user = Meteor.users.findOne({'emails.address' : collaborator});
//         if (user) {
//           console.log('found the matching user', user.username);
//
//           console.log('lets try adding the document name', doc.name);
//           Meteor.users.update({_id: user._id}, {$addToSet:{
//             'collaborations': doc._id
//           }}, function (error, result){
//             if (error) {
//               console.log('error', error);
//             }
//           });
//         }
//       }
//     });
//   }
//
//   console.log('Collaboration.name', doc.name);
//   console.log('Collaboration.getCollaborators()', doc.getCollaborators());
//
//   //
//   // User.getAllCollaborations().forEach(function(collaboration){
//   //
//   // });
//
//
//   // refreshUserProfileCollaborations = function (){
//   //   User.getAllCollaborations().forEach(function(collaboration){
//   //
//   //   })
//   // }
//
//
// });
// Collaborations.after.update(function (userId, doc) {
//   //doc.createdAt = Date.now();
// });
