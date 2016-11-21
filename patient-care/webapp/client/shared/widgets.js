// Template.widgetsDemo
// This template is for internal documentation only.

Template.widgetsDemo.onCreated(function () {
  let instance = this;

  instance.error = new ReactiveVar({
    header: "I am a header",
    message: "You did something very wrong.",
  });
});

Template.widgetsDemo.helpers({
  fakeObject() {
    return {
      _id: "I am an _id",
      collaborations: [
        "wow Teo is so cool",
        "Ellen is cool too I guess",
        "I am a potato collaboration name",
      ],
    };
  },
  reactiveError() { return Template.instance().error; },
  fakeSamples() {
    return [
      "ckcc/A01",
      "ckcc/A02",
      "ckcc/A03",
      "ckcc/A04",
      "ckcc/A05",
      "ckcc/B01",
      "ckcc/B02",
      "ckcc/B03",
      "ckcc/B04",
      "ckcc/B05",
    ];
  },
  fakeJob(status) {
    return { status };
  },
  noAction() {
    return {
      action: "nothing"
    };
  },
});

// Template.shareAndDeleteButtons

Template.shareAndDeleteButtons.onCreated(function() {
  let instance = this;

  instance.deleteClicked = new ReactiveVar(false);
});

Template.shareAndDeleteButtons.helpers({
  deleteClicked() { return Template.instance().deleteClicked.get(); },
});

Template.shareAndDeleteButtons.events({
  "click .share.button"(event, instance) {
    Session.set("editCollaborationsCollection", instance.data.collectionName);
    Session.set("editCollaborationsMongoIds", [ instance.data.object._id ]);

    $('.edit-collaborations-modal').modal('show');
  },
  "click .delete.button": function(event, instance) {
    var deleteClicked = instance.deleteClicked;

    if (deleteClicked.get()) {
      Meteor.call("removeObject", instance.data.collectionName,
          instance.data.object._id, (error) => {
        if (error) throw error;

        let onDelete = instance.data.onDelete;
        if (onDelete) {
          onDelete();
        }
      });
    } else {
      deleteClicked.set(true);

      // if they click elsewhere, cancel remove
      // wait until propogation finishes before registering event handler
      Meteor.defer(() => {
        $("html").one("click", () => {
          deleteClicked.set(false);
        });
      });
    }
  },
});

// Template.editCollaborationsModal

Template.editCollaborationsModal.onCreated(function() {
  let instance = this;

  instance.waitingForServer = new ReactiveVar(false);
  instance.collabsList = new ReactiveVar([]);

  // who the user can share with
  instance.autorun(() => {
    const collectionName = Session.get("editCollaborationsCollection");
    const mongoIds = Session.get("editCollaborationsMongoIds");

    // wait until we're logged-in because when the user refreshes there's
    // a slight delay before logging in where it'll run this code and fail
    if (Meteor.user() && mongoIds) {
      Meteor.call("getCollabDescriptions", collectionName, mongoIds,
          (error, result) => {
        if (error) throw error;

        instance.collabsList.set(result);
      });
    }
  });
});

Template.editCollaborationsModal.onRendered(function() {
  let instance = this;

  // only initialize the collaboration search when the user is logged in
  // because the API url depends on it the login token
  instance.autorun(() => {
    if (Meteor.user()) {
      // destroy any possible old search
      $(".collaboration-search").search("destroy");

      // set up the collaboration search
      $(".collaboration-search").search({
        apiSettings: {
          url: `${location.origin}/search/collaborations` +
              `?token=${Accounts._storedLoginToken()}&q={query}`,
          onResponse(response) {
            // remove existing users/collaborations from the response
            let allExisting = instance.collabsList.get();

            const removeExisting = (resultsAttribute, type) => {
              // save the parent so we can set .results easily
              const resultsParent = response.results[resultsAttribute];
              const { results } = resultsParent;

              const existingIdsOfType = _.pluck(_.where(allExisting, {
                type
              }), "id");

              // we're rarely going to have more than 2
              // collaborators, so indexOf is fine
              resultsParent.results = _.filter(results, (result) => {
                return existingIdsOfType.indexOf(result.id) === -1;
              });

              // if there are no results, remove the category
              // so that we get a "No results" thing
              if (resultsParent.results.length === 0) {
                delete response.results[resultsAttribute];
              }
            };

            removeExisting("collaborations", "collaboration");
            removeExisting("users", "user");

            return response;
          },
        },
        type: "category",
        onSelect(result, response) {
          let collabsList = instance.collabsList.get();

          collabsList.push(result);

          instance.collabsList.set(collabsList);

          // clear the cache of searches so that we can remove
          // the just-selected item from the results before displaying them
          $(".collaboration-search").search("clear cache");
        },
      });
    } else {
      // destroy any possible old search
      $(".collaboration-search").search("destroy");
    }
  });

  instance.$('.edit-collaborations-modal').modal({
    onApprove() {
      // TODO: another modal if they're going to lose access to the objects

      let newCollabs = _.pluck(instance.collabsList.get(), "id");

      instance.waitingForServer.set(true);

      let collectionName = Session.get("editCollaborationsCollection");
      let mongoIds = Session.get("editCollaborationsMongoIds");

      Meteor.call("updateObjectCollaborations",
          collectionName, mongoIds, newCollabs,
          (error) => {
        instance.waitingForServer.set(false);
        if (!error) {
          $('.edit-collaborations-modal').modal("hide");
        }
      });

      return false;
    },
    observeChanges: true,
  });
});

Template.editCollaborationsModal.helpers({
  mongoIds() {
    return Session.get("editCollaborationsMongoIds");
  },
  multipleObjects() {
    const ids = Session.get("editCollaborationsMongoIds");
    return ids && ids.length > 1;
  },
  waitingForServer() { return Template.instance().waitingForServer.get(); },
  collabsList() { return Template.instance().collabsList; },
});

// Template.listCollaborators

Template.listCollaborators.helpers({
  collabsList() {
    let data = Template.currentData();

    if (data && data.collabsList) {
      return data.collabsList.get();
    }
  },
});

Template.listCollaborators.events({
  "click .remove-collaboration"(event, instance) {
    let collabsList = instance.data.collabsList.get();

    collabsList = _.filter(collabsList, (collabDesc) => {
      return collabDesc.id !== this.id;
    });

    instance.data.collabsList.set(collabsList);
  },
});

// Template.showErrorMessage

Template.showErrorMessage.helpers({
  getError: function () {
    return Template.instance().data.get();
  },
});

Template.showErrorMessage.events({
  "click .close-error-message": function (event, instance) {
    instance.data.set(null);
  },
});

// Template.contactUsButton

Template.contactUsButton.helpers({
  emailSubject() {
    return `MedBook%20Patient%20Care:%20${FlowRouter.current().path}`;
  },
});

// Template.listSamplesButton

Template.listSamplesButton.onCreated(function () {
  let instance = this;

  let showAllDefault = instance.data.length <= 5;
  instance.showAllSamples = new ReactiveVar(showAllDefault);

  instance.hideStudyLabels = new ReactiveVar(false);
});

Template.listSamplesButton.helpers({
  showAllSamples() { return Template.instance().showAllSamples.get(); },
  hideStudyLabels() { return Template.instance().hideStudyLabels.get(); },
  sampleToShow() {
    let instance = Template.instance();

    let sampleLabels = instance.data;

    // remove study labels if necessary
    if (instance.hideStudyLabels.get()) {
      sampleLabels = MedBook.utility.unqualifySampleLabels(sampleLabels);
    }

    // return either the whole list or the first couple items
    if (instance.showAllSamples.get()) {
      return sampleLabels;
    } else {
      return sampleLabels
        .slice(0, 3)
        .concat([`... and ${sampleLabels.length - 3} more samples`]);
    }
  },
  dropdownOptions() {
    return {
      action: "nothing"
    };
  },
});

Template.listSamplesButton.events({
  "click .show-list"(event, instance) {
    instance.showAllSamples.set(!instance.showAllSamples.get());
  },
  "click .toggle-study-labels"(event, instance) {
    instance.hideStudyLabels.set(!instance.hideStudyLabels.get());
  },
});

// Template.semanticUIDropdown

Template.semanticUIDropdown.onRendered(function () {
  this.$(".ui.dropdown").dropdown(this.data.options);
});

// Template.semanticUICheckbox

Template.semanticUICheckbox.onRendered(function () {
  this.$(".ui.checkbox").checkbox(this.data.options);
});

// // Template.semanticUIPopup
//
// // can give:
// // selector=".ui.popup.hi.yop"
// // options={ option: "hi" }
// Template.semanticUIPopup.onRendered(function () {
//   let { selector } = this.data;
//   if (!selector) {
//     selector = ".ui.checkbox";
//   }
//
//   this.$(selector).checkbox(this.data.options);
// });

// Template.viewJobButton

Template.viewJobButton.onCreated(function () {
  let instance = this;

  instance.deleteClicked = new ReactiveVar(false);
});

Template.viewJobButton.onRendered(function () {
  this.$(".ui.dropdown").dropdown({
    // don't bold what's clicked
    action: "nothing"
  });
});

Template.viewJobButton.helpers({
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  buttonClass() {
    if (this.job.status === "done") { return "primary"; }
    else if (this.job.status === "error") { return "negative"; }
    // else { return "" }
  },
});

Template.viewJobButton.events({
  "click .share-job"(event, instance) {
    Session.set("editCollaborationsCollection", "Jobs");
    Session.set("editCollaborationsMongoIds", [this.job._id]);

    $(".edit-collaborations-modal").modal("show");
  },
  "click .delete-job"(event, instance) {
    var deleteClicked = instance.deleteClicked;

    if (deleteClicked.get()) {
      Meteor.call("removeObjects", "Jobs", [this.job._id]);
    } else {
      deleteClicked.set(true);

      // if they click elsewhere, cancel remove
      // wait until propogation finishes before registering event handler
      Meteor.defer(() => {
        $("html").one("click", () => {
          deleteClicked.set(false);
        });
      });
    }
  },
});

// Template.jobStatusWrapper

Template.jobStatusWrapper.onCreated(function () {
  let instance = this;

  // subscribe and keep up to date
  instance.autorun(function () {
    instance.subscribe("specificJob", Template.currentData());
  });
});

Template.jobStatusWrapper.helpers({
  getJob: function () {
    return Jobs.findOne(this.toString());
  },
});

// Template.showRecords

Template.showRecords.onCreated(function () {
  let instance = this;

  let { mongoId, collectionName } = instance.data;

  instance.gettingRecordsData = new ReactiveVar(true);
  instance.recordsData = [];
  Meteor.call("getRecords", collectionName, mongoId, (error, result) => {
    if (error) { throw error; }
    else {
      instance.recordsData = result;
      instance.gettingRecordsData.set(false);
    }
  });
});

Template.showRecords.helpers({
  gettingRecordsData() {
    return Template.instance().gettingRecordsData.get();
  },
  recordsData() {
    return Template.instance().recordsData;
  },
});

// Template.recordsHandsOnTable

Template.recordsHandsOnTable.onRendered(function () {
  let instance = this;
  let { recordsData, fields, primaryFieldName } = instance.data;

  // calculate the spreadsheet columns
  // always have the sample label field be first
  let columns = [ { data: primaryFieldName } ];
  let colHeaders = [ primaryFieldName ];

  _.each(fields, (field) => {
    if (field.name !== primaryFieldName) {
      columns.push({ data: field.name });
      colHeaders.push(field.name);
    }
  });

  var container = document.getElementById('recordsHOT');
  var hot = new Handsontable(container, {
    data: recordsData,
    startRows: fields.length,
    startCols: recordsData.length,
    columns,
    colHeaders,
    readOnly: true
  });
});

Template.recordsHandsOnTable.helpers({
  height() {
    if (this.recordsData.length > 150) {
      // make the table as tall as the viewfinder
      // http://stackoverflow.com/a/16837667/1092640
      return "100vh";
    } else {
      return "100%";
    }
  },
});
