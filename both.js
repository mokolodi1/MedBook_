// custom validation error message for when the collaboration name starts
// with "user:"
SimpleSchema.messages({
  collabNameCantStartWithUser: "Collaboration mames can't start with \"user:\"",
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
        return "collabNameCantStartWithUser";
      }
    },
  },
  description: { type: String },

  collaborators: { type: [String] },
  // if there are no administrators, the collaboration is considered deleted
  // and cannot be managed or recreated
  administrators: { type: [String] },

  isUnlisted: { type: Boolean, label: "Unlisted" },
  invitations: { type: [String], optional: true },
  requests: { type: [String], optional: true },
  adminApprovalRequired: {
    type: Boolean,
    label: "Admin approval required to join",
  },
}));
MedBook.Collections.Collaborations = Collaborations;



// Meteor.users "_transform"
// does a findOne on Meteor.users and adds some useful functions to that
MedBook.findUser = function (userId) {
  var user = Meteor.users.findOne(userId);

  if (user) {
    _.extend(user, {
      // getCollaborations is global in the package
      // and is defined seperately on the client and server
      personalCollaboration: personalCollaboration,
      getCollaborations: getCollaborations, // different on client/server
      hasAccess: hasAccess,
      ensureAccess: ensureAccess,
      isAdmin: isAdmin,
      ensureAdmin: ensureAdmin,
    });
  }

  return user;
};

function personalCollaboration () {
  return this.collaborations.personal;
}

MedBook.ensureUser = function (userId) {
  var user = MedBook.findUser(userId);

  if (!user) {
    throw new Meteor.Error("not-logged-in", "Please log in.");
  }

  return user;
};

/**
 * @summary Return whether a user is an administrator of a collaboration.
 * @locus Both
 * @memberOf User
 * @returns {boolean}
 * @example
 * ```js
 * if (MedBook.findUser(userId).isAdmin("collaboration name")) {
 *   // do something
 * }
 * if (MedBook.findUser(userId).isAdmin(collaborationObject)) {
 *   // do something
 * }
 * ```
 */
function isAdmin(collaborationOrName) {
  var collaboration;

  if (typeof collaborationOrName === "string") {
    collaboration = Collaborations.findOne({name: collaborationOrName});
  } else {
    collaboration = collaborationOrName;
  }

  if (!collaboration.administrators) {
    return false;
  }

  // convert the collaborations the user is a part of into a hash table for
  // quick access
  var userCollabs = this.getCollaborations.call(this);
  var userCollabObj = _.reduce(userCollabs, function (memo, collabName) {
    memo[collabName] = true;
    return memo;
  }, {});

  // loop through the list of administrators and check if the user is a
  // member of any of them
  return _.some(collaboration.administrators, function (collabName) {
    return userCollabObj[collabName];
  });
}

/**
 * @summary Ensure a user is an administrator of a collaboration. If the user
 *          is not an administrator, throw an error.
 * @locus Both
 * @memberOf User
 * @returns {boolean}
 * @example
 * ```js
 * MedBook.findUser(userId).ensureAdmin("collaboration name");
 * // security-protected code
 *
 * // or
 * MedBook.findUser(userId).ensureAdmin(collaborationObject);
 * // security-protected code
 * ```
 */
function ensureAdmin(collaborationOrName) {
  if (this.isAdmin.call(this, collaborationOrName)) {
    return true;
  } else {
    throw new Meteor.Error("permission-denied");
  }
}

/**
 * @summary Return whether a user has access to an object or collaboration name.
 *          For objects, this is done by checking either the `collaborations`
 *          array or the `user_id` field.
 * @locus Both
 * @memberOf User
 * @returns {boolean}
 * @example
 * ```js
 * MedBook.findUser(userId).ensureAccess(SampleGroups.findOne(sampleGroupId));
 * // security-protected code
 *
 * // or
 * MedBook.findUser(userId).ensureAccess("collaboration name");
 * // security-protected code
 * ```
 */
function hasAccess (objOrName) {
  // If objOrName is a name, create a "fake" object with only the
  // collaborations field. Otherwise just continue on as usual...
  var obj;
  if (typeof objOrName === "string") {
    obj = {
      collaborations: [objOrName]
    };
  } else {
    obj = objOrName;
  }

  // if the object is falsey or doesn't have one of the things we can check
  // for access (collaborations or user_id), return false
  if (!obj || (!obj.collaborations && !obj.user_id)) {
    return false;
  }

  // default to checking the user_id
  // if user_id is defined but doesn't match, continue
  if (obj.user_id && obj.user_id === this._id) {
    return true;
  }

  if (obj.collaborations) {
    // convert obj.collaborations into a hash map for fast access
    var collabObj = _.reduce(obj.collaborations, function (memo, collabName) {
      memo[collabName] = true;
      return memo;
    }, {});

    // check to see if there is an intersection between the obj collaborations
    // and the user's collaborations
    var userCollaborations = this.getCollaborations.call(this);
    return _.some(userCollaborations, function (name) {
      return collabObj[name];
    });
  }

  // couldn't verify access
  return false;
}

/**
 * @summary Ensure a user has access to an object or collaboration
 *          (otherwise throw an Error)
 * @locus Both
 * @memberOf User
 * @returns {boolean}
 * @example
 * ```js
 * MedBook.findUser(userId).ensureAccess(SampleGroups.findOne(sampleGroupId));
 * // security-protected code
 *
 * // or
 * MedBook.findUser(userId).ensureAccess("collaboration name");
 * // security-protected code
 * ```
 */
function ensureAccess (objOrName) {
  if (this.hasAccess.call(this, objOrName)) {
    return true;
  } else {
    throw new Meteor.Error("permission-denied");
  }
}
