# MedBook Collaborations

`medbook:collaborations` makes it easy to write collaboration security into Meteor methods and publications. Remember: a collaboration has access to items up the collaboration tree but not down.

## Diagrams

### A possible collaboration scenario

![Collaboration scenario](/docs/collaboration_scenario.png?raw=true "Optional Title")

### ... and the resulting access...

![Collaboration scenario resulting access](/docs/collaboration_scenario_resulting_accesss.png?raw=true "Optional Title")

## The User object

To fetch a MedBook user object, use `MedBook.findUser()`.

While it is technically possible to attach a transform to the Meteor.users collection (`Meteor.users._transform = ...`), this approach is not recommended. [See here for more info](https://github.com/meteor/meteor/issues/810#issuecomment-15069258).

```js
// outside publish functions
let user = MedBook.findUser(Meteor.userId());

// inside publish functions
let user = MedBook.findUser(this.userId);
```

To get the personal collaboration associated with a user, use `user.personalCollaboration`.

```js
let user = MedBook.findUser(Meteor.userId());
let userCollab = user.personalCollaboration(); // "user:username@domain.suffix"
```

To get a list of the collaborations a user is a part of, use `getCollaborations`. On both client and server, this returns `user.collaborations.memberOf`, however on the server this list is updated before it is returned. (Internally, `collaboration.getAssociatedCollaborators()` is used.) Currently, the `memberOf` list is updated every time this function is called. In the future, we may add throttling to this update function (ex. updating only a minute after the last update).
```js
let user = MedBook.findUser(Meteor.userId());
let collaborations = user.getCollaborations();
// ex. ["user:test@test.com", "Testing lab UCSC", "Cool RNA-Seq project"]
```

To check if a user has access to an object, use `hasAccess` (returns boolean). To throw an error if the user doesn't have access, use `ensureAccess`. These functions take one parameter: either a collaboration object or a collaboration name (string). Use `ensureAccess` unless you specifically need to do something if the user doesn't have access.

In determining if a user has access to an object, two fields are checked. A user is considered to have access if the `user_id` field matches the `_id` of the currently logged in user. A user is also considered to have access if they have access to one or more of the collaborations in the `collaborations` field.

```js
Meteor.methods({
  // do something, but only if they have access to the "CKCC" collaboration
  CKCCDoSomething: function () {
    let user = MedBook.findUser(Meteor.userId()); // can throw "user-not-found"

    if (user.hasAccess("CKCC")) {
      console.log("We are doing something with the CKCC collaboration!");
    } else {
      console.log("Someone tried to do something but didn't have access.");
    }
  },

  // remove a sample group by _id
  removeSampleGroup: function (sampleGroupId) {
    check(sampleGroupId, String); // can throw match error

    let user = MedBook.findUser(Meteor.userId()); // can throw "user-not-found"
    let sampleGroup = SampleGroups.findOne(sampleGroupId);
    user.ensureAccess(sampleGroup); // throws "permission-denied" if no access

    SampleGroups.remove(sampleGroupId); // we made it!
  }
});

// publish a specific study
Meteor.publish("specificStudy", function (study_label) {
  check(study_label, String);

  let user = MedBook.findUser(this.userId); // can throw "user-not-found"
  let study = Studies.findOne({ id: study_label });
  user.ensureAccess(study); // throws "permission-denied" if no access

  return Studies.find({ id: study_label });
});
```

To check if a user is an admin for a collaboration, use `isAdmin` (returns boolean). To throw an error if the user isn't an admin, use `ensureAdmin`. Like `hasAccess` and `ensureAccess`, these functions take one parameter: either a collaboration object or a collaboration name (string).

```js
Meteor.methods({
  // removes a collaboration
  removeCollaboration: function (collaborationName) {
    let user = MedBook.findUser(Meteor.userId());
    user.ensureAdmin(collaborationName); // throws "permission-denied"

    // The collaboration remove code in MedBook is actually slightly more
    // complicated because we don't want users to be able to create a
    // collaboration with the name of a collaboration that has been deleted.
    Collaborations.remove({name: collaborationName});
  }
});
```

## The Collaboration object

Two methods are available on the server for objects fetched from the Collaborations collection (ex. `Collaborations.findOne()`).  `getAssociatedCollaborators` does a downwards tree traversal, returning a list of collaborations (including personal collaborations) that have access to the source collaboration. `getAssociatedCollaborations` does an upwards tree traversal, returning a list of collaborations that the source collaboration has access to. Both of these functions return an array of collaboration name strings.

These two functions are provided for `medbook:collaboration`'s internal API and advanced users. Use them with care!
