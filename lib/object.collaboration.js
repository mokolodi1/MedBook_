
//==========================================================================

Collaboration = {
  administrators: [],
  collaborators: [],
  invitations: [],
  requests: []
};


Collaboration = BaseModel.extend();

//Assign a reference from Meteor.users to User.prototype._collection so BaseModel knows how to access it
Collaboration.prototype._collection = Collaborations;


Collaboration.prototype.isTrue = function () {
  return true;
};
Collaboration.parse = function (collaboratorsInputString) {
  var collaboratorsArray = collaboratorsInputString.split(",");
  collaboratorsArray.forEach(function (emailAddress){
    emailAddress.trim();
  });
  return collaboratorsArray;
};
//==========================================================================

// getCheckedCollaboration
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
// getCollaborationUrl
Collaboration.prototype.getUrl = function (name) {
  return "/collaboration/" + name;
};



//==========================================================================

Collaboration.prototype.removeCollaborator = function (emailAddress) {
  this.collaborators.pop(collaborators.indexOf(emailAddress));
};
Collaboration.prototype.addCollaborator = function (emailAddress) {
  this.collaborators.push(emailAddress);
};
Collaboration.prototype.addCollaborators = function (collaboratorsInputString) {
  var collaboratorsArray = collaboratorsInputString.split(",");
  collaboratorsArray.forEach(function (emailAddress){
    emailAddress.trim();
    Collaboration.addCollaborator(emailAddress);
  });
};
Collaboration.prototype.listCollaborator = function (user) {
  var collaboratorsSet = [];
  this.collaborators.forEach(function (username){
    collaboratorsSet.push(Meteor.findOne(username));
  });
  return collaboratorsSet;
};
Collaboration.prototype.addAdministrator = function (emailAddress) {
  this.administrators.push(emailAddress);
};
Collaboration.prototype.addAdministrators = function (administratorsInputString) {
  var administratorsArray = administratorsInputString.split(",");
  administratorsArray.forEach(function (emailAddress){
    emailAddress.trim();
    Collaboration.addAdministrator(emailAddress);
  });
};
Collaboration.prototype.removeAdministrator = function (emailAddress) {
  this.administrators.pop(administrators.indexOf(emailAddress));
};
Collaboration.prototype.listAdministrator = function (user) {
  var administratorsSet = [];
  this.administrators.forEach(function (username){
    administratorsSet.push(Meteor.findOne(username));
  });
  return administratorsSet;
};

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
Collaboration.prototype.hasApplied = function (emailAddress){
  if (this.requests.indexOf(emailAddress) > -1) {
    return true;
  } else {
    return false;
  }
};


//==========================================================================

// postSubmitClientCallbacks.push(getCheckedCollaboration);
// postEditClientCallbacks.push(getCheckedCollaboration);

//==========================================================================



if (Meteor.isClient){




  // collabNames
  Collaboration.prototype.getNames = function () {
    var users = Meteor.users.find({}, {fields: {username:1}}).fetch();
    var cols = Collaborations.find({}, {fields: {name:1}}).fetch();
    var names = users.map( function (f){ return f.username; }).concat(cols.map( function (f){ return f.name; }));
    names = names.filter( function (f) { return f && f.length > 0; });
    names.push("public");
    var data = names.map( function (f) { return {id: f, text:f }; });
    return data;
  };


  // doneEditOrAddCollaborators
  Collaboration.prototype.doneUpserting = function() {
    $('#addCollaboratorsDialog').remove();
    setTimeout(function() { $('.cover').remove();}, 100);
  };

  // // hideEditOrAddCollaboration
  // Collaboration.hideUpsert = function() {
  //   $(".collapsed").hide();
  // };

  //Collaboration.prototype.collabNames = this.getNames();
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
