medbook:collaborations
========================================

Collaboration based security architecture (similar to Roles and Friends) using a bottom-up collaboration model.

========================================
## Installation

````
meteor add medbook:collaborations
````

========================================
## UI overview

#### Default sharing UI
![Default share UI](/images/default_share.png?raw=true)

#### Advanced sharing UI
![Advanced share UI](/images/advanced_share.png?raw=true)

#### Link sharing UI
![Link sharing UI](/images/link_sharing.png?raw=true)

========================================
#### Collaboration Schema

````js
{
  _id: { type: String, optional: true },
  slug: { type: String, optional: true },
  isUnlisted: { type: Boolean },
  name: { type: String, optional: true, unique: true },
  description: { type: String, optional: true },
  collaborators: { type: [String] },
  administrators: { type: [String] },
  invitations: { type: [String], optional: true },
  requests: { type: [String], optional: true },
  requiresAdministratorApprovalToJoin: { type: Boolean, autoform: { label: "" } }
}
````


========================================
#### Creating a Collaboration

```js
Collaborations.create({
  name: "SampleCollab",
  description: "Lorem ipsum...",
  isUnlisted: false,
  requiresAdministratorApproval: false,
  collaborators: ['janedoe@test.org'],
  administrators: ['janedoe@test.org'],
  invitations: [],
  requests: []
})
```
========================================
#### What collaborations am I in (directly)?

```js

  var user = Meteor.users.findOne({_id: Meteor.user().userId})
  var myCollaborations = Collaborations.find( collaborations: user.defaultEmail() }).fetch();
});
```

========================================
#### Filtering Publications to include Associated Collaborations (very efficent)

```js

Meteor.publish("studies", function (studyId) {
  var associatedCollaborations = Meteor.users.findOne({_id: this.userId}).getAssociatedCollaborations();
  return Studies.findOne({
    collaborations: {$in: associatedCollaborations}
  });
});
```

========================================
#### Collaboration Object



````js
  Collaboration.save();
  Collaboration.getSelected(properties);
  Collaboration.getUrl(collaborationName);
  Collaboration.removeCollaborator(emailAddress);
  Collaboration.addCollaborator(emailAddress);
  Collaboration.addCollaborators(collaboratorsInputString);
  Collaboration.addAdministrator(emailAddress);
  Collaboration.addAdministrators(administratorsInputString);
  Collaboration.removeAdministrator(emailAddress);
  Collaboration.hasMember(emailAddress);
  Collaboration.hasApplied(emailAddress);
  Collaboration.getNames();
  Collaboration.getCollaboratorsGraph();
  Collaboration.getExtendedGraph();
  Collaboration.getCollaborators();

  // client
  Collaboration.create();
  Collaboration.getNames();
  Collaboration.upsertCompleted();
  Collaboration.upsertFinished();

  // server
  Collaboration.parseCookies();
  Collaboration.lookupToken();
  Collaboration.fetchToken();
````


========================================
#### Server Methods

````js
  Meteor.call('/collaboration/create');
  Meteor.call('/collaboration/join');
  Meteor.call('/collaboration/apply');
  Meteor.call('/collaboration/leave');
````


========================================
#### Collaboration Model

The clinical:collaborations package uses the following security scenario for testing and verification testing.  It should be stressed that a **bottom-up** collaboration model is used; meaning the users associated with the collaboration at the 'top' of the model have the least access to individual projects, but the widest influence. This is not a command-and-control hierarchy.  It's is a distributed collaboration network.

![security-schema](https://raw.githubusercontent.com/clinical-meteor/clinical-collaborations/master/docs/Collaboration%20Scenario.PNG)

Given the above security scenario should result in the following record access for each collaborator:
![resulting-access](https://raw.githubusercontent.com/clinical-meteor/clinical-collaborations/master/docs/Collaboration%20Scenario%20-%20Resulting%20Access.PNG)

========================================
#### Acknowledgements  

This package was funded through the gracious support of the UC Santa Cruz Medbook team.

========================================
#### Licensing  

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
