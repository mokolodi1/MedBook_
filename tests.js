console.log("I think I'm going to wait until we move to 1.3 to add testing");

if (Meteor.isServer) {
  Meteor.methods({
    "test/method": function () {
      return true;
    },
    "test/throws": function () {
      throw new Meteor.Error();
    },
  });
}


if (Meteor.isClient) {
  testAsyncMulti("MeteorFile - Test Method", [
    function (test, expect) {
      Meteor.call("test/throws", expect(function (err, res) {
        test.instanceOf(err, Meteor.Error);
      }));
    }
  ])
}
