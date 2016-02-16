// custom validation error message for when the collaboration name starts
// with "user:"
SimpleSchema.messages({
  nameCantStartWithUser: "Name can't start with \"user:\"",
});
// attach the schema to collaborations seperately from defining it because it's
// defined seperately on the server and client
Collaborations.attachSchema(new SimpleSchema({
  name: {
    type: String,
    unique: true,
    custom: function () {
      // don't allow name to start with "user:"
      var name = this.value;
      if (name.startsWith("user:")) {
        return "nameCantStartWithUser";
      }
    },
  },
  description: { type: String },

  collaborators: { type: [String] },
  administrators: { type: [String] },

  isUnlisted: { type: Boolean },
  invitations: { type: [String], optional: true },
  requests: { type: [String], optional: true },
  requiresAdministratorApprovalToJoin: { type: Boolean }
}));



// used to validate the object used to describe a single object when a user
// is editing its collaborations
singleObjectSchema = new SimpleSchema({
  collectionString: {
    type: String,
    allowedValues: [
      "SampleGroups",
    ],
  },
  objectId: { type: String },
});


// Search Meteor.users for where collaborations.personal contains searchText.
// used on both server and client
findUsersPersonalCollabs = function (searchText) {
  return Meteor.users.find({
    "collaborations.email_address": { $regex: new RegExp(searchText) }
  }, {
    limit: 3,
    fields: {
      // include so the query works on the client
      "collaborations.email_address": 1,
      "collaborations.personal": 1,
    },
  });
};



// Meteor.users "_transform"
// does a findOne on Meteor.users and adds some useful functions to that
MedBook.findUser = function (userId, securityOkay) {
  if (!securityOkay) {
    console.log("don't forget to do a security check on the method/publish");
    console.log("new Error().stack:", new Error().stack);
  }

  var user = Meteor.users.findOne(userId);

  if (user) {
    _.extend(user, {
      // getCollaborations is global in the package
      // and is defined seperately on the client and server
      getCollaborations: getCollaborations,
      hasAccess: hasAccess,
      ensureAccess: ensureAccess,
    });
  }

  return user;
};

MedBook.ensureUser = function (userId) {
  var user = MedBook.findUser(userId, true);

  if (!user) {
    throw new Meteor.Error("not-logged-in", "Please log in.");
  }

  return user;
};

/**
 * @summary Ensure a user has access to an object or collaboration
 *          (otherwise throw an Error)
 * @locus Both
 * @memberOf User
 * @returns {boolean}
 * @example
 * ```js
 * MedBook.findUser(userId).ensureAccess(SampleGroups.findOne(sampleGroupId));
 * MedBook.findUser(userId).ensureAccess("collaboration name");
 * ```
 */
ensureAccess = function (objOrName) {
  if (this.hasAccess.call(this, objOrName)) {
    return true;
  } else {
    throw new Meteor.Error("permission-denied");
  }
};
