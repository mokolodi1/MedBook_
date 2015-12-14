

Collaboration = {
  administrators: [],
  collaborators: [],
  invitations: [],
  requests: []
};


Collaboration = BaseModel.extend();

Collaboration.prototype._collection = Collaborations;



/**
 * @summary Save the collaboration object to the database.
  * @locus Anywhere
 * @memberOf Collaboration
 * @name save
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.addCollaborator("janedoe@test.org");
 * collaboration.save()
 * ```
 */

Collaboration.save = function () {
  var diffUpdate = this;
  delete diffUpdate._id;

  Collaborations.upsert({_id: this._id}, {$set: diffUpdate});
};


/**
 * @summary Creates a new collaboration.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name parse
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.parse()
 * ```
 */
Collaboration.parse = function (collaboratorsInputString) {
  var collaboratorsArray = collaboratorsInputString.split(",");
  collaboratorsArray.forEach(function (emailAddress){
    emailAddress.trim();
  });
  return collaboratorsArray;
};
//==========================================================================

/**
 * @summary Scans the DOM and picks up selected values.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name getSelected
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.getSelected()
 * ```
 */
Collaboration.prototype.getSelected = function (properties) {
  properties.collaboration = [];
  $(".selectCollaborators").select2("val").map(function (name) {
    properties.collaboration.push(name);
  });
  if (properties.collaboration === []) {
    properties.collaboration = ["public"];
  }
  return properties;
};


/**
 * @summary Returns a relative url where a user can get details of the collaboration.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name getUrl
 * @version 1.2.3
 * @deprecated
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.getUrl(collaborationName)
 * ```
 */
Collaboration.prototype.getUrl = function (collaborationName) {
  return "/collaboration/" + collaborationName;
};



//==========================================================================

/**
 * @summary Removes the specified collaborator from the Collaboration.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name removeCollaborator
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.removeCollaborator('janedoe@test.org');
 * ```
 */

Collaboration.prototype.removeCollaborator = function (emailAddress) {
  this.collaborators.pop(collaborators.indexOf(emailAddress));
};

/**
 * @summary Adds a collaborator to the Collaboration.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name addCollaborator
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.addCollaborator('janedoe@test.org');
 * ```
 */
Collaboration.prototype.addCollaborator = function (emailAddress) {
  this.collaborators.push(emailAddress);
};

/**
 * @summary Adds a collaborator to the Collaboration.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name addCollaborators
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.addCollaborators('janedoe@test.org, johndoe@someplace.org');
 * ```
 */
Collaboration.prototype.addCollaborators = function (collaboratorsInputString) {
  var collaboratorsArray = collaboratorsInputString.split(",");
  collaboratorsArray.forEach(function (emailAddress){
    emailAddress.trim();
    Collaboration.addCollaborator(emailAddress);
  });
};


/**
 * @summary Adds an administrator to the Collaboration.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name addAdministrator
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.addAdministrator('janedoe@test.org');
 * ```
 */
Collaboration.prototype.addAdministrator = function (emailAddress) {
  this.administrators.push(emailAddress);
};

/**
 * @summary Adds an administrator to the Collaboration.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name addAdministrators
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.addAdministrators('janedoe@test.org, johndoe@someplace.org');
 * ```
 */
Collaboration.prototype.addAdministrators = function (administratorsInputString) {
  var administratorsArray = administratorsInputString.split(",");
  administratorsArray.forEach(function (emailAddress){
    emailAddress.trim();
    Collaboration.addAdministrator(emailAddress);
  });
};

/**
 * @summary Removes an administrator from the Collaboration.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name removeAdministrator
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * collaboration.removeAdministrator('janedoe@test.org');
 * ```
 */
Collaboration.prototype.removeAdministrator = function (emailAddress) {
  this.administrators.pop(administrators.indexOf(emailAddress));
};

/**
 * @summary Checks if a Collaboration has a particular email address as a collaborator or administrator.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name hasMember
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * if (collaboration.hasMember('janedoe@test.org')){
 *   // do stuff
 * }
 * ```
 */
Collaboration.prototype.hasMember = function (emailAddress){
  var result = false;
  if (this.administrators.indexOf(emailAddress) > -1) {
    result = true;
  }
  if (this.collaborators.indexOf(emailAddress) > -1) {
    result = true;
  }
  return result;
};


/**
 * @summary Determines if user has applied to the Collaboration and is waiting in the requests queue.
 * @locus Anywhere
 * @memberOf Collaboration
 * @name hasApplied
 * @version 1.2.3
 * @example
 * ```js
 * var collaboration = Collaborations.findOne({_id: "ucsc"});
 * if (collaboration.hasApplied('janedoe@test.org')){
 *   // do stuff
 * }
 * ```
 */
Collaboration.prototype.hasApplied = function (emailAddress){
  if (this.requests.indexOf(emailAddress) > -1) {
    return true;
  } else {
    return false;
  }
};


if (Meteor.isClient){



  /**
   * @summary Gets the names of all the
   * @locus Client
   * @memberOf Collaboration
   * @name getNames
   * @version 1.2.3
   * @deprecated
   * @example
   * ```js
   * var collaboration = Collaborations.findOne({_id: "ucsc"});
   * collaboration.getNames('janedoe@test.org')
   * ```
   */

  Collaboration.prototype.getNames = function () {
    var users = Meteor.users.find({}, {fields: {username:1}}).fetch();
    var cols = Collaborations.find({}, {fields: {name:1}}).fetch();
    var names = users.map( function (f){ return f.username; }).concat(cols.map( function (f){ return f.name; }));
    names = names.filter( function (f) { return f && f.length > 0; });
    names.push("public");
    var data = names.map( function (f) { return {id: f, text:f }; });
    return data;
  };
}





if (Meteor.isServer){
  Collaboration.prototype.parseCookies = function (cookiesString) {
    var cookies = {};

    cookiesString.split(';').forEach( function ( cookie ) {
      var parts = cookie.split('=');
      cookies[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return cookies;
  };

  Collaboration.prototype.lookupToken = function (token) {
    var user = Meteor.users.findOne({
      $or: [
        {'services.resume.loginTokens.hashedToken': token},
        {'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(token)}
      ]
    });
    return user;
  };

  Collaboration.prototype.fetchToken = function (requestHeaders) {
    var token = null;
    if (requestHeaders && requestHeaders.cookie && requestHeaders.cookie.length > 0) {
      var cookie = parseCookies(requestHeaders.cookie);

      if (cookie && 'meteor_login_token' in cookie && cookie[ 'meteor_login_token' ].length > 0){
        token = cookie[ 'meteor_login_token' ];
      }
    }
    return token;
  };
}


Collaboration.prototype.getCollaboratorsGraph = function () {
  //process.env.DEBUG && console.log('Collaboration.getCollaborators', JSON.stringify(this));

  // TRANSITIVE CLOSURE QUEUE METHOD

  // the graph of collaborators we want to return
  var collaboratorsGraph = [];

  // the dynamic queue of tree nodes that we're going to parse through
  var collaborationLookupQueue = [];

  // add the current collaboration id by default
  collaborationLookupQueue.push(this._id);

  // iterate through all the collaborators
  this.collaborators.forEach(function(collaborator){

    // parse whether they're nodes or leaves
    if (collaborator.indexOf("@") === -1) {
      // add nodes to our queue
      collaborationLookupQueue.push(collaborator);
    }
  });

  // for each node in our queue
  for (var i = 0; i < collaborationLookupQueue.length; i++) {

    // save it in a variable
    var collaborator = collaborationLookupQueue[i];

    // look it up from the collection
    var collaboration = Collaborations.findOne({
      _id: collaborator
    });

    // look through the collaborators
    collaboration.collaborators.forEach(function(collaborator){
      // and then time look for leaves, not nodes
      if (collaborator.indexOf("@") > -1) {
        // and add the leaves to our graph
        collaboratorsGraph.push(collaborator);
      } else {
          // and add the nodes to our queue after checking it's not there already
        if (collaborationLookupQueue.indexOf(collaborator) === -1) {
          collaborationLookupQueue.push(collaborator);
        }
      }
    });
  }

  // when all done, return the graph
  return collaboratorsGraph;
};



Collaboration.prototype.getExtendedGraph = function () {
  process.env.DEBUG && console.log('Collaboration.getCollaborators', JSON.stringify(this));

  // TRANSITIVE CLOSURE QUEUE METHOD

  // put each email in our search queue
  var collaborationSet = {};

  var collaborationLookupQueue = this.collaborators;
  //process.env.DEBUG && console.log('collaborationLookupQueue', collaborationLookupQueue);
  console.log('collaborationLookupQueue', collaborationLookupQueue);

  // for each email in our queue
  for (var i = 0; i < collaborationLookupQueue.length; i++) {
    var collaborator = collaborationLookupQueue[i];

    // look across the collaborations collection for records that contain that email
    Collaborations.find({
      collaborators: collaborator
    }, {
      fields: {
        name: true,
        collaborators: true
      }
    }).forEach(function (collaboration) {
      console.log('found a matching record!', collaboration);
      // for each resulting collaboration containing one of the user's email addresses
      // add the collaboration to our resulting list
      if (!(collaboration._id in collaborationLookupQueue)) {
        collaborationSet[collaboration.name] = collaboration._id;
        collaborationLookupQueue.push(collaboration._id);
      }
    });
  }
  //process.env.DEBUG && console.log('collaborationSet', collaborationSet);
  console.log('collaborationSet', collaborationSet);

  return Object.keys(collaborationSet).sort();
};

/**
 * @summary Return the collaborators attached to the current Collaboration as an array.
 * @locus Anywhere
 * @function
 * @memberOf Collaboration
 * @name getCollaborators
 * @since clinical:METEOR@1.1.3
 * @example
```
var collaboration = Collaborations.findOne({_id: "ucsc"});
collaboration.getNames('janedoe@test.org')
```
 */
Collaboration.prototype.getCollaborators = function () {
  return this.collaborators;
};




//==========================================================================
