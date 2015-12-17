
describe('clinical:collaborations - getCollaboratorsGraph()', function () {
  var server = meteor();
  var client = browser(server);

  var collaborationId = null;
  var initializationCompleted = false;

  before(function () {
    server.execute(function () {
      // Collaborations.remove({});
      // Meteor.users.remove({});
      // Studies.remove({});

      // Meteor.call('initializeUsers');
      // Meteor.call('initializeDefaultCollaborations');
      // Meteor.call('initializeSecurityScenarioStudies');

      // ============================================================================
      // INITIALIZE USERS
      var userId = null;
      // crate our administrator

      // crate our administrator
      userId = Accounts.createUser({
        username: 'house',
        password: 'house',
        email: 'house@test.org',
        profile: {
          fullName: 'Gregory House',
          role: 'Physician',
          avatar: '/packages/clinical_accounts-housemd/housemd/gregory.house.jpg'
        }
      });
      console.info('Account created: ' + userId);

      userId = Accounts.createUser({
        username: 'camron',
        password: 'camron',
        email: 'camron@test.org',
        profile: {
          fullName: 'Test User',
          role: 'Physician',
          avatar: '/packages/clinical_accounts-housemd/housemd/allison.camron.jpg'
        }
      });
      console.info('Account created: ' + userId);

      // crate our administrator
      userId = Accounts.createUser({
        username: 'foreman',
        password: 'foreman',
        email: 'foreman@test.org',
        profile: {
          fullName: 'Eric Foreman',
          role: 'Physician',
          avatar: '/packages/clinical_accounts-housemd/housemd/eric.foreman.jpg'
        }
      });
      console.info('Account created: ' + userId);

      // crate our administrator
      userId = Accounts.createUser({
        username: 'wilson',
        password: 'wilson',
        email: 'wilson@test.org',
        profile: {
          fullName: 'James Wilson',
          role: 'Physician',
          avatar: '/packages/clinical_accounts-housemd/housemd/james.wilson.jpg'
        }
      });
      console.info('Account created: ' + userId);


      // crate our administrator
      userId = Accounts.createUser({
        username: 'kutner',
        password: 'kutner',
        email: 'kutner@test.org',
        profile: {
          fullName: 'Lawrence Kutner',
          role: 'Physician',
          avatar: '/packages/clinical_accounts-housemd/housemd/lawrence.kutner.jpg'
        }
      });
      console.info('Account created: ' + userId);


      // crate our administrator
      userId = Accounts.createUser({
        username: 'cuddy',
        password: 'cuddy',
        email: 'cuddy@test.org',
        profile: {
          fullName: 'Lisa Cuddy',
          role: 'Physician',
          avatar: '/packages/clinical_accounts-housemd/housemd/lisa.cuddy.jpg'
        }
      });
      console.info('Account created: ' + userId);


      // crate our administrator
      userId = Accounts.createUser({
        username: 'chase',
        password: 'chase',
        email: 'chase@test.org',
        profile: {
          fullName: 'Robert Chase',
          role: 'Physician',
          avatar: '/packages/clinical_accounts-housemd/housemd/robert.chase.jpg'
        }
      });
      console.info('Account created: ' + userId);



      // crate our administrator
      userId = Accounts.createUser({
        username: 'thirteen',
        password: 'thirteen',
        email: 'thirteen@test.org',
        profile: {
          fullName: 'Thirteen',
          role: 'Physician',
          avatar: '/packages/clinical_accounts-housemd/housemd/thirteen.jpg'
        }
      });
      console.info('Account created: ' + userId);

      // ============================================================================
      // INITIALIZE COLLABORATIONS

      Collaborations.insert({
        _id: "ckcc",
        isUnlisted: false,
        name: "California Kids Cancer Comparison",
        description: "",
        collaborators: ["thirteen@test.org", "kutner@test.org"],
        administrators: ["thirteen@test.org"],
        invitations: [],
        requests: [],
        requiresAdministratorApprovalToJoin: false
      });

      Collaborations.insert({
        _id: "wcdt",
        isUnlisted: false,
        name: "West Coast Dream Team",
        description: "",
        collaborators: ["cuddy@test.org"],
        administrators: ["cuddy@test.org"],
        invitations: [],
        requests: [],
        requiresAdministratorApprovalToJoin: false
      });

      Collaborations.insert({
        _id: "ucsc",
        isUnlisted: false,
        name: "UC Santa Cruz",
        description: "",
        collaborators: ["foreman@test.org", "wcdt"],
        administrators: ["foreman@test.org"],
        invitations: [],
        requests: [],
        requiresAdministratorApprovalToJoin: false
      });

      Collaborations.insert({
        _id: "genomics",
        isUnlisted: false,
        name: "Cancer Genomics",
        description: "",
        collaborators: ["kutner@test.org", "chase@test.org", "ucsc"],
        administrators: ["kutner@test.org"],
        invitations: [],
        requests: [],
        requiresAdministratorApprovalToJoin: false
      });

      Collaborations.insert({
        _id: "ucsf",
        isUnlisted: false,
        name: "UC San Francisco",
        description: "",
        collaborators: ["camron@test.org", "house@test.org", "wcdt"],
        administrators: ["house@test.org"],
        invitations: [],
        requests: [],
        requiresAdministratorApprovalToJoin: false
      });

      Collaborations.insert({
        _id: "ucla",
        isUnlisted: false,
        name: "UC Los Angeles Francisco",
        description: "",
        collaborators: ["wilson@test.org", "wcdt"],
        administrators: ["wilson@test.org"],
        invitations: [],
        requests: [],
        requiresAdministratorApprovalToJoin: false
      });

      // ============================================================================
      // INITIALIZE STUDIES

      //Studies = new Mongo.Collection('studies');

      Studies.upsert({
        _id: "neuroblastoma"
      }, {
        $set: {
          "cbio_id": "112",
          "name": "Nifty Neuroblastoma Study",
          "short_name": "neuroblastoma",
          "description": "Nifty Neuroblastoma Study",
          "public": false,
          "citation": "unpublished",
          "collaborations": [],
          "tables": [],
          "Questionnaires": [
            "Patient_Enrollment_form",
            "RNASeq_completion_form",
            "Followup"
          ]
        }
      });
      Studies.upsert({
        _id: "lymphoma"
      }, {
        $set: {
          "cbio_id": "112",
          "name": "Lazy Lymphoma Study",
          "short_name": "lymphoma",
          "description": "Lazy Lymphoma Study",
          "public": false,
          "citation": "unpublished",
          "collaborations": [],
          "tables": [],
          "Questionnaires": [
            "Demographics",
            "Followup"
          ]
        }
      });
      Studies.upsert({
        _id: "granuloma"
      }, {
        $set: {
          "cbio_id": "112",
          "name": "Grumpy Granuloma Study",
          "short_name": "granuloma",
          "description": "Grumpy Granuloma Study",
          "public": false,
          "citation": "unpublished",
          "collaborations": [],
          "tables": [],
          "Questionnaires": [
            "Patient_Enrollment_form",
            "Blood_Labs_V2",
            "Followup"
          ]
        }
      });


      Studies.upsert({
        _id: "carcinoma"
      }, {
        $set: {
          "cbio_id": "112",
          "name": "Cranky Carcinoma Study",
          "short_name": "carcinoma",
          "description": "Cranky Carcinoma Study",
          "public": false,
          "citation": "unpublished",
          "collaborations": [],
          "tables": [],
          "Questionnaires": [
            "RNASeq_completion_form",
            "Followup"
          ]
        }
      });
      Studies.upsert({
        _id: "melanoma"
      }, {
        $set: {
          "cbio_id": "112",
          "name": "Meloncholy Melanoma Study",
          "short_name": "melanoma",
          "description": "Meloncholy Melanoma Study",
          "public": false,
          "citation": "unpublished",
          "collaborations": [],
          "tables": [],
          "Questionnaires": [
            "RNASeq_completion_form",
            "Followup"
          ]
        }
      });
      Studies.upsert({
        _id: "sarcoma"
      }, {
        $set: {
          "cbio_id": "112",
          "name": "Sappy Sarcoma Study",
          "short_name": "sarcoma",
          "description": "Sappy Sarcoma Study",
          "public": false,
          "citation": "unpublished",
          "collaborations": [],
          "tables": [],
          "Questionnaires": [
            "Laser_Capture_Microdissection",
            "Followup"
          ]
        }
      });

      Studies.upsert({
        _id: "satisfaction"
      }, {
        $set: {
          "cbio_id": "112",
          "name": "Patient Satisfaction Study",
          "short_name": "satisfaction",
          "description": "Patient Satisfaction Study",
          "public": false,
          "citation": "unpublished",
          "collaborations": [],
          "tables": [],
          "Questionnaires": [
            "Patient_Satisfaction"
          ]
        }
      });
      return true;
    }).then(function (value){
      initializationCompleted = value;
    });
  });

  after(function () {
    server.execute(function () {
      Collaborations.remove({});
      Meteor.users.remove({});
      Studies.remove({});
      initializationCompleted = false;
    });
  });


  it('Confirm house exists', function () {
    server.execute(function () {
      return Meteor.users.findOne({username: 'house'});
    }).then(function (user){
      expect(user).to.exist;
      expect(user.username).to.equal('house');
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

  it('confirm house acount is initialized', function () {
    return server.wait(1000, "until users are loaded", function () {
      return Meteor.users.findOne({username: "house"});
    }).then(function (user){
      expect(user.username).to.equal("house");
    });
  });
  it('Confirm CKCC collaboration exists', function () {
    return client.execute(function () {
      var collaboration = Collaborations.findOne({_id: 'ckcc'});
      expect(collaboration).not.to.be.empty;
      expect(collaboration._id).to.equal('ckcc');
      expect(collaboration.name).to.equal('California Kids Cancer Comparison');
    });
  });

  it('Confirm users are initialized', function () {
    return server.wait(1000, "until users are loaded", function () {
      return Meteor.users.find().fetch();
    }).then(function (users){
      expect(users.length).to.equal(8);
    });
  });
  it('Confirm collaborations are initialized', function () {
    return server.wait(1000, 'until collaborations collection is available on server', function (){
    // return server.execute(function (){
      return Collaborations.find().fetch();
    }).then(function (collaborations){
      expect(collaborations.length).to.equal(6);
    });
  });
  it('Confirm studies are initialized', function () {
    return server.wait(1000, "until studies are loaded", function () {
    // return server.execute(function () {
      return Studies.find().fetch();
    }).then(function (studies){
      expect(studies.length).to.equal(7);
    });
  });




  it("Collaboration.getCollaborators()", function () {
    return server.wait(1000, 'until collaborations collection is available on server', function (){
      return Collaborations.findOne({_id: 'ucsc'}).getCollaborators();
    }).then(function (collaborators){
      expect(collaborators.length).to.equal(2);
    });
  });
  it("Collaboration.getExtendedGraph()", function () {
    return server.wait(1000, 'until collaborations collection is available on server', function (){
      return Collaborations.findOne({_id: 'ucsc'}).getExtendedGraph();
    }).then(function (collaborators){
      expect(collaborators.length).to.equal(4);
    });
  });

  // it("Other collections can use Collaborations.getCollaborationGraph() in their publication functions.", function () {
  //   return client.execute(function () {
  //     expect(false).to.be.true;
  //   });
  // });



});
