# medbook:collaborations

### An example of a Meteor method that uses this package

```js
Meteor.methods({
  removeSampleGroup: function (sampleGroupId) {
    check(sampleGroupId, String); // can throw match error

    var user = MedBook.findUser(Meteor.userId()); // can throw "user-not-found"
    var sampleGroup = SampleGroups.findOne(sampleGroupId);
    // can throw "permission-denied" if no access or invalid sampleGroup
    user.ensureAccess(sampleGroup);

    SampleGroups.remove(sampleGroupId); // we made it!
  },
});
```

### To subscribe to a single object with collaboration security

```js
var sampleGroupId = SampleGroups.findOne();

Meteor.subscribe("/collaborations/singleObject", {
  collectionString: "SampleGroups",
  objectId: sampleGroupId,
});
```
