SimpleSchema.messages({
  collabNameCantHaveAmpersand: "Collaboration names can't contain \"@\"",
});
// attach the schema to collaborations seperately from defining it because it's
// defined seperately on the server and client
Collaborations.attachSchema(new SimpleSchema({
  name: {
    type: String,
    unique: true,
    custom: function () {
      var name = this.value;

      if (name.indexOf("@") !== -1) { // don't allow name to contain "@"
        return "collabNameCantHaveAmpersand";
      }
    },
  },
  description: { type: String },

  collaborators: { type: [String], defaultValue: [], minCount: 0 },

  // If there are no administrators, the collaboration is considered deleted
  // and cannot be managed or recreated. This is important because we don't
  // want someone to be able to recreate a collaboration that has been deleted
  // in case there are reminant links to it that haven't been deleted.
  // If a collaboration has no administrators, it cannot have any
  // collaborators
  administrators: { type: [String] },

  publiclyListed: {
    type: Boolean,
    label: "Publicly listed",
    defaultValue: false,
    optional: true,
  },
  // invitations: { type: [String], optional: true },
  requestsToJoin: {
    type: [new SimpleSchema({
      fullName: { type: String },
      preferredName: { type: String },
      email: { type: String },
      personalCollaboration: { type: String },
    })],
    defaultValue: [],
    optional: true
  },
  adminApprovalRequired: {
    type: Boolean,
    label: "Admin approval required to join",
    defaultValue: true,
  },
}));

// don't want to force people to use primary-collections, but if they are...
if (MedBook.collections) {
  MedBook.collections.Collaborations = Collaborations;
}

// I don't necessarily like how this is loaded on both the client and server
// but putting this code in a Meteor.isClient is the cleanest way I can think
// of sharing the userSub with MedBook.findUser.
if (Meteor.isClient) {
  // Available in MedBook.findUser function; set within this block.
  // Needs to be a ReactiveVar because the subscription could change
  // if the user logs out/in
  var userSub = new ReactiveVar();

  // We need this so that we get the extra fields in the user objects
  Tracker.autorun(function () {
    var user = Meteor.user(); // makes it reactive :)

    userSub.set(Meteor.subscribe("/collaborations/user"));
  });
}

// does a findOne on Meteor.users and adds some useful functions to that
MedBook.findUser = function (query) {
  var user = Meteor.users.findOne(query);

  // if we're on the client return null until we have all the data loaded
  if (Meteor.isClient && !userSub.get().ready()) {
    return null;
  }

  if (user) {
    _.extend(user, {
      // getCollaborations is global in the package
      // and is defined seperately on the client and server
      personalCollaboration: personalCollaboration,
      email: email,
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

function email () {
  return this.collaborations.email_address;
}

MedBook.ensureUser = function (query) {
  var user = MedBook.findUser(query);

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
function hasAccess (objNameOrArray) {
  if (!objNameOrArray) return false;

  // If objNameOrArray is a name or an array, create a "fake" object with
  // only the collaborations field. Otherwise just continue on as usual...
  var obj;

  if (typeof objNameOrArray === "string") {
    obj = { collaborations: [objNameOrArray] };
  } else if (Array.isArray(objNameOrArray)) {
    obj = { collaborations: objNameOrArray };
  } else if (objNameOrArray.collaborators) {
    obj = { collaborations: objNameOrArray.collaborators };
  } else if (objNameOrArray.associated_object) {
    // If we're on the client the associated object isn't necessarily loaded,
    // so assume they have access. (Otherwise the object wouldn't have loaded.)
    if (Meteor.isClient) { return true; }

    // recursively call hasAccess
    var collection_name = objNameOrArray.associated_object.collection_name;
    var mongo_id = objNameOrArray.associated_object.mongo_id;

    var collection = MedBook.collections[collection_name];

    return hasAccess.call(this, collection.findOne(mongo_id));
  } else {
    obj = objNameOrArray;
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
