
describe('clinical:collaborations', function () {
  var server = meteor();
  var client = browser(server);
  var collaborationId = null;
  var ckccCollaboration = {
    _id: "ckcc",
    isUnlisted: false,
    name: "California Kids Cancer Comparison",
    description: "",
    collaborators: ["thirteen@test.org", "kutner@test.org"],
    administrators: ["thirteen@test.org"],
    invitations: [],
    requests: [],
    requiresAdministratorApprovalToJoin: false
  };

  beforeEach(function () {
    server.execute(function () {
      return Collaborations.insert(ckccCollaboration);
    }).then(function (value){
      collaborationId = value;
    });
  });
  afterEach(function () {
    server.execute(function () {
      Collaborations.remove({});
    });
  });

  it('Should exist on the client', function () {
    return client.execute(function () {
      expect(Collaborations).not.to.be.empty;
    });
  });

  it('Should exist on the server', function () {
    return server.execute(function () {
      expect(Collaborations).not.to.be.empty;
    });
  });
  it('Client can access collaboration records', function () {
    client.wait(500, 'until collaborations collection is available on server', function (){
      var collaboration = Collaborations.findOne({_id: 'ckcc'});
      expect(collaboration).to.exist;
      expect(collaboration._id).to.equal('ckcc');
    });
  });

  it('Server can access collaboration records', function () {
    // return server.wait(500, 'until collaborations collection is available on server', function (){
    server.execute(function () {
      return Collaborations.findOne({_id: 'ckcc'});
    }).then(function (collaboration){
      expect(collaboration).to.exist;
      expect(collaboration._id).to.equal('ckcc');
    });
  });

  it('Collaboration.addCollaborator() on server should update Collaboration.getCollaborators() on client', function () {
    // return server.wait(500, 'until collaboration variables are available on server', function (){
    server.execute(function () {
      var collaboration = Collaborations.findOne({_id: 'ckcc'});
      collaboration.addCollaborator("janedoe@test.org");
      collaboration.save();
    }).then(function (value) {
      client.wait(500, 'until collaboration variables are available on client', function (){
        var collaboration = Collaborations.findOne({_id: 'ckcc'});
        expect(collaboration.hasMember("janedoe@test.org")).to.be.true;
        expect(collaboration.getCollaborators().length).to.equal(3);
      });
    });

  });
});
