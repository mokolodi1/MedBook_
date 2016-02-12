# medbook:collaborations

### An example of a Meteor method that uses this package

```js
Meteor.methods({
  removeSampleGroup: function (sampleGroupId) {
    check(sampleGroupId, String); // throws match error

    var user = MedBook.findUser(Meteor.userId()); // throws "user-not-found"
    var sampleGroup = SampleGroups.findOne(sampleGroupId);
    // throws "permission-denied" if no access or invalid sampleGroup
    user.ensureAccess(sampleGroup);

    SampleGroups.remove(sampleGroupId); // we made it!
  },
});
```
