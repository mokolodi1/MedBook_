var testAccountId = null;

describe('clinical:collaborations', function () {
  beforeAll(function () {
    if (Meteor.isServer) {
      Meteor.users.remove({});
    }
    if (Meteor.isClient) {
      Meteor.users.insert({
        username: "testAccount",
        email: "testAccount@somewhere.net",
        password: "testAccount",
        profile: {
          collaborations: "foo"
        }
      });
    }
  });
  afterEach(function () {
    if (Meteor.isServer) {
      Collaborations.remove({});
    }
  });
  // beforeEach(function () {
  //   if (Meteor.isClient) {
  //     if (Meteor.user()) {
  //       Meteor.logout();
  //     }
  //   }
  // });



  describe('Collaboration - isTrue()', function () {
    it('returns true', function () {
      expect(Collaboration.isTrue()).to.be.true;
    });
  });
  describe('Collaborations - isTrue()', function () {
    it('returns true', function () {
      expect(Collaborations.isTrue()).to.be.true;
    });
  });
  describe('Collaborations - insert()', function () {
    it('returns true', function () {
      expect(Collaborations.find().count()).to.equal(0);
      Collaborations.insert({
        name: "foo",
        isUnlisted: false,
        requiresAdministratorApprovalToJoin: false,
        administrators: [],
        collaborators: []
      });
      expect(Collaborations.find().count()).to.equal(1);

      var collab = Collaborations.findOne({name: "foo"});
      expect(collab.isUnlisted).to.be.false;
      expect(collab.requiresAdministratorApprovalToJoin).to.be.false;
      expect(collab.name).to.equal("foo");
    });
  });
  describe('Collaboration - getUrl()', function () {
    it('returns /collaboration/foo', function () {
      expect(Collaboration.getUrl("foo")).to.equal('/collaboration/foo');
    });
  });
  // describe('Collaboration - addCollaborators()', function () {
  //   it('should add a collaborator to the collaboration', function () {
  //     expect(true).to.be.false;
  //   });
  // });
  // describe('Collaboration - listCollaborator()', function () {
  //   it('should return a list of collaborators', function () {
  //     expect(true).to.be.false;
  //   });
  // });
  // describe('Collaboration - removeCollaborator()', function () {
  //   it('should remove a collaborator', function () {
  //     expect(true).to.be.false;
  //   });
  // });



});
