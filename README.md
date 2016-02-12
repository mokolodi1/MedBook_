# medbook:collaborations


### An example of a Meteor method that uses this package

```js
Meteor.methods({
  "removeSampleGroup": function (sampleGroupId) {
    check(sampleGroupId, String);

    var user = MedBook.findUser(Meteor.userId());
    var sampleGroup = SampleGroups.findOne(sampleGroupId);

    if (user && user.hasAccess(sampleGroup)) {
      SampleGroups.remove(sampleGroupId);
    } else {
      throw new Meteor.Error("permission-denied");
    }
  },
});
```
