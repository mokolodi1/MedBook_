// Template.manageObjects

var managableTypes = [
  {
    collectionSlug: "data-sets",
    humanName: "Data Sets",
    singularName: "data set",
    collectionName: "DataSets",
    introTemplate: "introDataSets",
    createTemplate: "createDataSet",
    showTemplate: "showDataSet",
  },
  {
    collectionSlug: "sample-groups",
    humanName: "Sample Groups",
    singularName: "sample group",
    collectionName: "SampleGroups",
    introTemplate: "introSampleGroups",
    createTemplate: "createSampleGroup",
    showTemplate: "showSampleGroup",
    permissionDeniedTemplate: "waitAndThenPermissionDenied",
  },
  {
    collectionSlug: "gene-sets",
    humanName: "Gene Sets",
    singularName: "gene set",
    collectionName: "GeneSets",
    introTemplate: "introGeneSets",
    createTemplate: "createGeneSet",
    showTemplate: "showGeneSet",
  },
  {
    collectionSlug: "gene-set-groups",
    humanName: "Gene Set Groups",
    singularName: "gene set group",
    collectionName: "GeneSetGroups",
    introTemplate: "introGeneSetGroups",
    createTemplate: "createGeneSetGroup",
    showTemplate: "showGeneSetGroup",
  },
  {
    collectionSlug: "studies",
    humanName: "Studies",
    singularName: "study",
    collectionName: "Studies",
    introTemplate: "introStudies",
    createTemplate: "createStudy",
    showTemplate: "showStudy",
  },
  {
    collectionSlug: "clinical-forms",
    humanName: "Clinical Forms",
    singularName: "clinical form",
    collectionName: "Forms",
    introTemplate: "introForms",
    createTemplate: "createForm",
    showTemplate: "showForm",
  },
];

Template.manageObjects.helpers({
  managableTypes: managableTypes,
  tabActive() {
    return this.collectionSlug === FlowRouter.getParam("collectionSlug");
  },
  selectedType() {
    let selected = FlowRouter.getParam("collectionSlug");

    return _.findWhere(managableTypes, { collectionSlug: selected });
  },
});

// Template.dataTypeInfoIcon

Template.dataTypeInfoIcon.onRendered(function () {
  let instance = this;

  instance.$(".help.circle.icon").popup({
    position: "bottom left",
    hoverable: true,
  });
});

// Template.manageObjectsGrid

Template.manageObjectsGrid.onCreated(function () {
  let instance = this;

  instance.currentlyManaging = new ReactiveVar();

  // subscribe to the names of the available data, and
  // set instance.currentlyManaging
  instance.autorun(() => {
    let slug = FlowRouter.getParam("collectionSlug");
    let currObj = _.findWhere(managableTypes, { collectionSlug: slug });

    instance.currentlyManaging.set(currObj);
    instance.subscribe("allOfCollectionOnlyMetadata", currObj.collectionName);
  });

  // if the user selected something before, select that one
  var lastSlug;

  instance.autorun((computation) => {
    let selected = FlowRouter.getParam("selected");
    let collectionSlug = FlowRouter.getParam("collectionSlug");

    if (lastSlug !== collectionSlug && !selected) {
      let fromSession = Session.get("manageObjects-" + collectionSlug);

      // Only execute after a bit because of a race condition between
      // this firing and the URL actually getting set.
      // (FlowRouter.getParam("selected") works fine but the URL is wrong)
      Meteor.defer(() => {
        FlowRouter.setParams({
          selected: fromSession
        });
      });
    } else {
      Session.set("manageObjects-" + collectionSlug, selected);
    }

    lastSlug = collectionSlug;
  });
});

Template.manageObjectsGrid.onRendered(function () {
  let instance = this;

  // NOTE: a deferred versino of refreshSticky is passed down all
  // the way to the create/showTemplate level

  // keep track of whether it's been stickied yet
  // start this out as false because it hasn't been stickied yet
  let stickied = false;

  // Make the manage object detail sticky so it moves down
  // the page as the user scrolls down.
  function refreshSticky() {
    // reactively watch the count of the items on the left so it'll update
    // when it changes, but don't do anything with the return value
    let hi = getObjects(instance).count();

    // Only activate the sticky when the height of the master list is
    // greater than a pageful. Don't have a sticky when creating a new object
    // because it's too annoying to keep refreshing the sticky.
    // (Creation UIs tend to get bigger as the user fills in information.)
    if (instance.$("#manage-obj-master").height() > $(window).height() &&
        FlowRouter.getParam("selected") !== "create") {
      if (stickied) {
        // refresh the sticky because it's been set up already
        instance.$("#manage-obj-detail").sticky("refresh");
      } else {
        // set up the sticky for the first time
        instance.$("#manage-obj-detail").sticky({
          context: "#manage-obj-context",
          offset: 55,
        });
      }

      stickied = true;
    } else {
      // destroy the sticky
      instance.$("#manage-obj-detail").sticky("destroy");

      stickied = false;
    }
  }

  // call it only after Blaze has rerendered
  deferredRefreshSticky = () => {

  };

  // call refreshSticky when a reactive variable changes
  instance.autorun(() => {
    refreshSticky();
  });

  // only call it 300 seconds after the thing has stopped resizing
  instance.debouncedRefreshSticky = _.debounce(function() {
    Meteor.defer(refreshSticky);
  }, 300);

  // call refreshSticky when the window is resized
  $(window).resize(instance.debouncedRefreshSticky);
});

function getObjects (instance, query = {}) {
  // get all the objects for this data type
  let slug = FlowRouter.getParam("collectionSlug");
  let managing = instance.currentlyManaging.get();

  return MedBook.collections[managing.collectionName].find(query, {
    // need to sort by _id also to break ties: if two things have the same
    // name, clicking on one can cause the list to reorder itself
    sort: { name: 1, version: 1, _id: 1 },
  });
}

Template.manageObjectsGrid.helpers({
  getObjects() { return getObjects(Template.instance()); },
  managingObject() {
    return this._id === FlowRouter.getParam("selected");
  },
  showVersion() {
    if (this.version) {
      let instance = Template.instance();

      // only show the version if the version isn't 1 or there's a duplicate
      return this.version !== 1 ||
          getObjects(instance, { name: this.name }).count() > 1;
    }
  },
  managableTypeAndRefreshSticky() {
    added = this;

    added.refreshSticky = Template.instance().debouncedRefreshSticky;

    return added;
  },
});

// Template.manageObject

Template.manageObject.onCreated(function () {
  let instance = this;

  // subscribe to the selected object
  instance.autorun(() => {
    let { collectionName } = instance.data;
    let selectedId = FlowRouter.getParam("selected");

    if (selectedId) {
      instance.subscribe("objectFromCollection", collectionName, selectedId);
    }
  });
});

Template.manageObject.helpers({
  getObjects() {
    return getObjects(Template.instance().parent());
  },
  getObject() {
    let slug = FlowRouter.getParam("collectionSlug");
    let managing = _.findWhere(managableTypes, { collectionSlug: slug });
    let selectedId = FlowRouter.getParam("selected");

    return MedBook.collections[managing.collectionName].findOne(selectedId);
  },
  onDelete() {
    return () => {
      FlowRouter.setParams({ selected: null });
    };
  },
  addRefreshSticky(obj) {
    obj.refreshSticky = this.refreshSticky;

    return obj;
  },
});
