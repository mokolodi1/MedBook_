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
  fakeSamplesSmall() {
    return [
      "ckcc/A01",
      "ckcc/A02",
      "ckcc/A03",
      "ckcc/A04",
    ];
  },
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
  fakeSamplesHuge() {
    let sampleLabels = [];

    _.times(1500, (n) => {
      sampleLabels.push(`ckcc/${n}`);
    });

    return sampleLabels;
  },
  fakeFeaturesSmall() {
    return [
      "FABP4",
      "ADIPOQ",
      "PPARG",
    ];
  },
  fakeFeatures() {
    return [
      "FABP4",
      "ADIPOQ",
      "PPARG",
      "LIPE",
      "DGAT1",
      "LPL",
      "CPT2",
      "CD36",
      "GPAM",
      "ADIPOR2",
      "ACAA2",
      "ETFB",
      "ACOX1",
    ];
  },
  lotsOfFeatures() {
    return "YOP|".repeat(10001).split("|").slice(0, 10000);
  },
  fakeJob(status) {
    return { status };
  },
  noAction() {
    return {
      action: "nothing"
    };
  },
  collabList() {
    return [
      MedBook.findUser(Meteor.userId()).personalCollaboration()
    ];
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
});

Template.editCollaborationsModal.onRendered(function() {
  let instance = this;

  instance.$('.edit-collaborations-modal').modal({
    onApprove() {
      // TODO: another modal if they're going to lose access to the objects

      instance.waitingForServer.set(true);

      let collectionName = Session.get("editCollaborationsCollection");
      let mongoIds = Session.get("editCollaborationsMongoIds");

      Meteor.call("updateObjectCollaborations",
          collectionName, mongoIds, instance.collabsList.get(),
          (error) => {
        instance.waitingForServer.set(false);
        if (!error) {
          $('.edit-collaborations-modal').modal("hide");
        }
      });

      return false;
    },
    observeChanges: true,

    // TODO: can we do a dimmer over a modal?
    allowMultiple: true,
  });
});

Template.editCollaborationsModal.helpers({
  waitingForServer() { return Template.instance().waitingForServer.get(); },
  collabsList() { return Template.instance().collabsList; },
  collectionName() { return Session.get("editCollaborationsCollection"); },
  mongoIds() { return Session.get("editCollaborationsMongoIds"); },
});

// Template.listCollaborators

Template.listCollaborators.onCreated(function () {
  let instance = this;

  instance.dataLoading = new ReactiveVar(false);

  // store the full descriptor objects here and pass the ids to
  // instance.data.collabList
  instance.collabDescriptors = new ReactiveVar([]);

  // pass the collaboration names to the parent template whenever
  // collabDescriptors changes
  instance.autorun(() => {
    let collabNames = _.pluck(instance.collabDescriptors.get(), "id");

    if (instance.data.collabsList) {
      instance.data.collabsList.set(collabNames);
    } else {
      console.error("forgot to pass listCollaborators collabsList");
    }
  });

  // cache old values of mongoIds, collectionName so it doesn't rerun a bunch
  let oldCollectionName, oldMongoIds;

  // who the user can share with
  instance.autorun(() => {
    let { collectionName, mongoIds, attribute } = Template.currentData();

    // get the correct collaborations for possibly many objects...
    // Wait until we're logged-in because when the user refreshes there's
    // a slight delay before logging in where it'll run this code and fail.
    // Sometimes collectionName and mongoIds needs to load with a subscription,
    // so wait until they're truthy.
    // Don't run again if nothing's changed.
    if (Meteor.userId() && collectionName && mongoIds &&
        !(collectionName === oldCollectionName &&
            _.isEqual(mongoIds, oldMongoIds))) {
      oldCollectionName = collectionName;
      oldMongoIds = mongoIds;

      // for now show "data loading" UI
      instance.dataLoading.set(true);

      if (!attribute) {
        attribute = "collaborations";
      }

      Meteor.call("getObjsCollabDescriptions", collectionName, mongoIds,
          attribute, (error, result) => {
        if (error) console.log("error:", error);

        instance.collabDescriptors.set(result);
        instance.dataLoading.set(false);
      });
    }
  });
});

Template.listCollaborators.helpers({
  collabsListFetched() {
    return Template.instance().collabDescriptors.get();
  },
  collabDescriptors() {
    return Template.instance().collabDescriptors;
  },
  not(thing) {
    return !thing;
  }
});

Template.listCollaborators.events({
  "click .remove-collaboration"(event, instance) {
    let collabDescriptors = instance.collabDescriptors.get();

    collabDescriptors = _.filter(collabDescriptors, (collabDesc) => {
      return collabDesc.id !== this.id;
    });

    instance.collabDescriptors.set(collabDescriptors);
  },
});

// Template.addCollaboratorSearch

Template.addCollaboratorSearch.onCreated(function () {
  let instance = this;

  // each one has a random id assigned so the jquery doesn't interfere
  instance.randomId = Random.id();
});

Template.addCollaboratorSearch.onRendered(function () {
  let instance = this;

  const searchJquery = `.${instance.randomId}.collaboration-search`;

  // only initialize the collaboration search when the user is logged in
  // because the API url depends on it the login token
  instance.autorun(() => {
    if (Meteor.user()) {
      // destroy any possible old search
      $(searchJquery).search("destroy");

      // set up the collaboration search
      $(searchJquery).search({
        apiSettings: {
          url: `${location.origin}/search/collaborations` +
              `?token=${Accounts._storedLoginToken()}&q={query}`,
          onResponse(response) {
            // remove existing users/collaborations from the response
            let allExisting = instance.data.collabDescriptors.get();

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
          let collabDescriptors = instance.data.collabDescriptors.get();

          // only add if it doesn't already exist
          if (_.pluck(collabDescriptors, "id").indexOf(result.id) === -1) {
            collabDescriptors.push(result);

            instance.data.collabDescriptors.set(collabDescriptors);
          }

          // clear the search input field and focus it (in case
          // they used the mouse to click an option, which
          // unfocuses the search input)
          Meteor.defer(() => {
            let searchInput = $(`${searchJquery} input`)[0];

            searchInput.value = "";
            searchInput.focus();
          });

          // clear the cache of searches so that we can remove
          // the just-selected item from the results before displaying them
          $(searchJquery).search("clear cache");
        },
      });
    } else {
      // destroy any possible old search
      $(searchJquery).search("destroy");
    }
  });
});

Template.addCollaboratorSearch.helpers({
  randomId() {
    return Template.instance().randomId;
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

  instance.showMore = new ReactiveVar(false);

  // set the showMore default value whenever the data changes
  instance.autorun(() => {
    let { sampleLabels } = Template.currentData();

    if (sampleLabels) {
      instance.showMore.set(sampleLabels.length <= 6);
    }
  });
});

Template.listSamplesButton.helpers({
  showMore() { return Template.instance().showMore.get(); },
  showStudyLabels() {
    let { profile } = Meteor.user();

    return profile && profile.showStudyLabels;
  },
  sampleToShow() {
    let instance = Template.instance();

    let { sampleLabels } = instance.data;

    // remove study labels if necessary
    let { profile } = Meteor.user();
    if (!profile || !profile.showStudyLabels) {
      sampleLabels = MedBook.utility.unqualifySampleLabels(sampleLabels);
    }

    // return either the whole list or the first couple items
    if (instance.showMore.get()) {
      if (instance.data.sampleLabels.length > 1000) {
        return sampleLabels
          .slice(0, 1000)
          .concat([`... and ${sampleLabels.length - 1000} more samples`]);
      }

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
  alwaysShowAll() {
    return this.sampleLabels && this.sampleLabels.length <= 6;
  },
  not(variable) {
    return !variable;
  },
  tooManyToShowAll() {
    return this.sampleLabels.length > 1000;
  },
});

Template.listSamplesButton.events({
  "click .toggle-list"(event, instance) {
    instance.showMore.set(!instance.showMore.get());
  },
  "click .toggle-study-labels"(event, instance) {
    let { profile } = Meteor.user();
    let newValue = !profile || !profile.showStudyLabels;

    Meteor.users.update(Meteor.userId(), {
      $set: {
        "profile.showStudyLabels": newValue
      }
    });
  },
  "click .download-list"(event, instance) {
    let { sampleLabels } = instance.data;

    // unqualify sample labels before downloading the list
    let { profile } = Meteor.user();
    if (!profile || !profile.showStudyLabels) {
      sampleLabels = MedBook.utility.unqualifySampleLabels(sampleLabels);
    }

    saveStringAsFile(sampleLabels.join("\n"), instance.data.filename);
  },
});

// Template.listFeaturesButton

let saveStringAsFile = function () {
  // run this once and then return a function which knows about this a tag
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";

  return function (data, fileName) {
    let blob = new Blob([data], { type: "text/plain" });
    let url = window.URL.createObjectURL(blob);

    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };
}();

Template.listFeaturesButton.onCreated(function () {
  let instance = this;

  instance.showMore = new ReactiveVar(false);

  // set the showMore default value whenever the data changes
  instance.autorun(() => {
    let { featureLabels } = Template.currentData();

    if (featureLabels) {
      instance.showMore.set(featureLabels.length <= 6);
    }
  });
});

Template.listFeaturesButton.helpers({
  showMore() { return Template.instance().showMore.get(); },
  featuresToShow() {
    let instance = Template.instance();

    let { featureLabels } = instance.data;

    if (featureLabels) {
      // return either the whole list or the first couple items
      if (instance.showMore.get()) {
        if (instance.data.featureLabels.length > 1000) {
          return featureLabels
            .slice(0, 1000)
            .concat([`... and ${featureLabels.length - 1000} more features`]);
        }

        return featureLabels;
      } else {
        return featureLabels
          .slice(0, 3)
          .concat([`... and ${featureLabels.length - 3} more features`]);
      }
    }
  },
  tooManyToShowAll() {
    return this.featureLabels.length > 1000;
  },
});

Template.listFeaturesButton.events({
  "click .toggle-list"(event, instance) {
    instance.showMore.set(!instance.showMore.get());
  },
  "click .download-list"(event, instance) {
    let text = instance.data.featureLabels.join("\n");

    saveStringAsFile(text, instance.data.filename);
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

// Template.semanticUIAccordion

Template.semanticUIAccordion.onRendered(function () {
  this.$(".ui.accordion").accordion(this.data);
});

// Template.semanticUIPopup

// can give:
// selector=".ui.popup.hi.yop"
// options={ option: "hi" }
Template.semanticUIPopup.onRendered(function () {
  let { selector, options } = this.data;

  if (!selector) {
    console.error("Didn't give a selector to the semanticUIPopup");
  } else {
    this.$(selector).popup(options);
  }
});

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
    else if (this.job.status === "running") { return "secondary"; }
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

// Template.jobWrapper

Template.jobWrapper.onCreated(function () {
  let instance = this;

  // subscribe and keep up to date
  instance.autorun(function () {
    instance.subscribe("specificJob", Template.currentData().job_id);
  });
});

Template.jobWrapper.helpers({
  getJob() {
    return Jobs.findOne(this.job_id);
  },
  onDeleteJob() {
    let { listRoute } = Template.instance().data;

    return function () {
      FlowRouter.go(listRoute);
    };
  },
});

// Template.jobErrorBlobs

Template.jobErrorBlobs.onCreated(function () {
  let instance = this;

  instance.subscribe("blobsAssociatedWithObject", "Jobs", instance.data._id);
});

Template.jobErrorBlobs.helpers({
  blobs() {
    return Blobs2.find({}, { sort: { file_name: 1 } });
  },
  blobUrl() {
    let userId = Meteor.userId();
    let loginToken = Accounts._storedLoginToken();
    let jobId = Template.instance().data._id;

    return `/download/${userId}/${loginToken}/job-blob/${jobId}/` +
        this.file_name;
  }
});

Template.gseaJob.events({
  "click .iframe-new-tab"(event, instance) {
    // open the current iFrame URL in a new tab: magic!
    console.log("this._id:", this._id);
    window.open($("#" + this._id).contents().get(0).location.href, "_blank");
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
    readOnly: true,
    columnSorting: true,
  });

  let { hotPassback } = instance.data;

  if (hotPassback) {
    hotPassback.hotInstance = hot;
    hotPassback.initialized.set(true);
  }
});

Template.recordsHandsOnTable.helpers({
  height() {
    if (this.recordsData.length > 100) {
      // make the table as tall as the viewfinder
      // http://stackoverflow.com/a/16837667/1092640
      return "100vh";
    } else {
      return "auto";
    }
  },
});

// Template.gseaFromGeneSetModal

// This modal depends on the geneSetIdForGsea query parameter.

Template.gseaFromGeneSetModal.onCreated(function () {
  instance = this;

  // if we're waiting for more than 10 seconds they probably don't have
  // access to the gene set, so tell them
  instance.permissionLikelyDenied = new ReactiveVar(false);

  let lastTimeout;

  // show the modal when the query param is set
  instance.autorun(() => {
    let geneSetId = FlowRouter.getQueryParam("geneSetIdForGsea");

    // reset permissionLikelyDenied and any previous timeouts
    instance.permissionLikelyDenied.set(false);
    Meteor.clearTimeout(lastTimeout);

    if (geneSetId) {
      // start a timer to flip permission likely denied on if it hasn't loaded
      lastTimeout = Meteor.setTimeout(() => {
        if (!GeneSets.findOne(geneSetId)) {
          instance.permissionLikelyDenied.set(true);
        }
      }, 5000);
    }
  });
});

Template.gseaFromGeneSetModal.onRendered(function () {
  let instance = this;

  instance.$(".gsea-from-gene-set.modal").modal({
    // remove geneSetIdForGsea from the query parameters when it is closed
    onHide() {
      // Defer setting the query parameters. When a user navigates away from
      // the page with the modal open (viewing a job, for example), the
      // query parameter is cleared before the route changes. This means
      // that when the user hits the back button, the query parameter won't
      // exist and the modal won't open automatically. Deferring waits
      // to clear the query param until the route has changed, which solves
      // this bug.
      Meteor.defer(() => {
        FlowRouter.setQueryParams({
          geneSetIdForGsea: null
        });
      });
    },
    observeChanges: true,
  });

  // show the modal when the query param is set
  instance.autorun(() => {
    let geneSetId = FlowRouter.getQueryParam("geneSetIdForGsea");

    if (geneSetId) {
      $(".gsea-from-gene-set.modal").modal("show");
    } else {
      $(".gsea-from-gene-set.modal").modal("hide");
    }
  });
});

Template.gseaFromGeneSetModal.helpers({
  previousJobsCols() {
    return [
      { title: "Ranking field", field: "args.gene_set_sort_field" },
      {
        title: "Gene sets",
        func: function (job) {
          return job.args.gene_set_group_names.join("\n");
        },
        fields: [ "args.gene_set_group_names" ],
      },
    ];
  },
  query() {
    return {
      "args.gene_set_id": FlowRouter.getQueryParam("geneSetIdForGsea"),
    };
  },
  getGeneSet() {
    let geneSetId = FlowRouter.getQueryParam("geneSetIdForGsea");

    if (geneSetId) {
      return GeneSets.findOne(geneSetId);
    }
  },
  extraFields() {
    return [ "args.gene_set_id" ];
  },
  permissionLikelyDenied() {
    return Template.instance().permissionLikelyDenied.get();
  },
});

// Template.recordsDownloadButton

Template.recordsDownloadButton.events({
  "click .download-hot-data"(event, instance) {
    let { hotPassback, filename } = instance.data;

    let exportPlugin = hotPassback.hotInstance.getPlugin('exportFile');
    exportPlugin.downloadFile("csv", { filename });
  },
});
