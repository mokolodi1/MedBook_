# MedBook Collaborations

`medbook:collaborations` makes it easy to write collaboration security into Meteor methods and publications. Remember: a collaboration has access to items up the collaboration tree but not down.

## Diagrams

### A possible collaboration scenario

![Collaboration scenario](/docs/collaboration_scenario.png?raw=true "Optional Title")

### ... and the resulting access...

![Collaboration scenario resulting access](/docs/collaboration_scenario_resulting_accesss.png?raw=true "Optional Title")

## The User object

The MedBook user object is just Meteor.user() with a `collaborations` field and a couple helper methods attached.

To fetch a MedBook user object, use `MedBook.findUser()`. `findUser` takes one parameter: the _id of the currently logged in user. To throw an error if the user is not logged in, use `MedBook.ensureUser()`. Use `ensureUser` unless you need to do something if no user is logged in.

On the client, `MedBook.findUser()` only returns the contents of `Meteor.user()` once the subscription loading the `user.collaborations` attribute is ready.

While it is technically possible to attach a transform directly to the Meteor.users collection (`Meteor.users._transform = ...`), this approach is not recommended. [See here for more info](https://github.com/meteor/meteor/issues/810#issuecomment-15069258).

```js
// outside publish functions
let user = MedBook.ensureUser(Meteor.userId());
// will not reach here if no user logged in

// inside publish functions
let user = MedBook.ensureUser(this.userId);

// if specific behavior is required if no user is logged in
let user = MedBook.findUser(Meteor.userId());
if (user) {
  // do something
} else {
  // do something else
}
```

To get the personal collaboration associated with a user, use `user.personalCollaboration()`. Currently, a user's personal collaboration is simply their email, but that may change in the future.

```js
let user = MedBook.ensureUser(Meteor.userId());
let userCollab = user.personalCollaboration(); // "username@domain.suffix"
```

To get a list of the collaborations a user is a part of, use `getCollaborations`. On both client and server, this returns `user.collaborations.memberOf`, however on the server this list is updated before it is returned. (Internally, `collaboration.getAssociatedCollaborators()` is used.) Currently, the `memberOf` list is updated every time this function is called. In the future, we may add throttling to this update function (ex. updating only a minute after the last update).
```js
let user = MedBook.ensureUser(Meteor.userId());
let collaborations = user.getCollaborations();
// ex. ["test@test.com", "Testing lab UCSC", "Cool RNA-Seq project"]
```

To check if a user has access to an object, use `hasAccess` (returns boolean). To throw an error if the user doesn't have access, use `ensureAccess`. These functions take one parameter: either a collaboration object, collaboration name (string), or an array of collaboration names. Use `ensureAccess` unless you need to do something if the user doesn't have access.

In determining if a user has access to an object, two fields are checked. A user is considered to have access if the `user_id` field matches the `_id` of the currently logged in user. A user is also considered to have access if they have access to one or more of the collaborations in the `collaborations` field.

```js
Meteor.methods({
  // do something, but only if they have access to the "CKCC" collaboration
  CKCCDoSomething: function () {
    let user = MedBook.ensureUser(Meteor.userId()); // can throw "user-not-found"

    if (user.hasAccess("CKCC")) { // or user.hasAccess(["CKCC"])
      console.log("We are doing something with the CKCC collaboration!");
    } else {
      console.log("Someone tried to do something but didn't have access.");
    }
  },

  // remove a sample group by _id
  removeSampleGroup: function (sampleGroupId) {
    check(sampleGroupId, String); // can throw match error

    let user = MedBook.ensureUser(Meteor.userId()); // can throw "user-not-found"
    let sampleGroup = SampleGroups.findOne(sampleGroupId);
    user.ensureAccess(sampleGroup); // throws "permission-denied" if no access

    SampleGroups.remove(sampleGroupId); // we made it!
  }
});

// publish a specific study
Meteor.publish("specificStudy", function (study_label) {
  check(study_label, String);

  let user = MedBook.ensureUser(this.userId); // can throw "user-not-found"
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
    let user = MedBook.ensureUser(Meteor.userId());
    user.ensureAdmin(collaborationName); // throws "permission-denied"

    // The collaboration remove code in MedBook is actually slightly more
    // complicated because we don't want users to be able to create a
    // collaboration with the name of a collaboration that has been deleted.
    Collaborations.remove({name: collaborationName});
  }
});
```

### Client-side data loading

`medbook:collaborations` uses a subscription to load the `collaborations` attribute of a user to the client-side seperate from the usual Meteor.user() subscription. Because of this, protecting UI code that requires user attributes with `{{currentUser}}` is not sufficient. Instead, use `{{currentMedBookUser}}`, which returns `MedBook.findUser(Meteor.userId())`.

```handlebars
{{#if currentMedBookUser}}
  {{! do something which requires user.collaborations to be loaded}}
{{/if}}
```

## The Collaboration object

Two methods are available on the server for objects fetched from the Collaborations collection (ex. `Collaborations.findOne()`).  `getAssociatedCollaborators` does a downwards tree traversal, returning a list of collaborations (including personal collaborations) that have access to the source collaboration. `getAssociatedCollaborations` does an upwards tree traversal, returning a list of collaborations that the source collaboration has access to. Both of these functions take no parameters and return an array of collaboration name strings.

These two functions are provided for `medbook:collaboration`'s internal API and advanced users. Use them with care!

## Use case questions

### Who needs access to run analysis? Who can see analysis results?

Currently a user has to have access to every study that is in a sample group in order to run an analysis in PatientCare. If one user runs an analysis with data that they have access to but others don’t, who should be able to see the results? Alternatively, if a user shares a sample group with a user that doesn't have access to some of the data in the sample group, can that user run analyses with that sample group? (My gut feeling says no.)

### Can a user over-share?

Can a user share a document with a collaboration they don’t have access to? One possible hiccup of enforcing a policy like this is that when someone updates a sample group shared with a distant collaboration the distant collaboration wouldn't have access to the updated group.
