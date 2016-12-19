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

  // NOTE: a deferred version of refreshSticky is passed down all
  // the way to the create/showTemplate level

  // keep track of whether it's been stickied yet
  // start this out as false because it hasn't been stickied yet
  let stickied = false;

  // Make the manage object detail sticky so it moves down
  // the page as the user scrolls down.
  function refreshSticky() {
    // Only activate the sticky when the height of the master list is larger
    // than that of the detail view. Semantic UI doesn't handle the sticky
    // well when the stickied content is taller than the wrapper.
    // Once a sticky has been destroyed for a route (it got taller than
    // the master list), don't watch to see if it gets shorter again. Instead,
    // wait until the selected item changes to check if we should recreate
    // the sticky.
    // Don't have a sticky when creating a new object because those UIs tend
    // to grow as the user fills in information.

    let masterHeight = instance.$("#manage-obj-master").height();
    let detailHeight = instance.$("#manage-obj-detail").height();

    if (detailHeight < masterHeight &&
        FlowRouter.getParam("selected") !== "create") {
      if (!stickied) {
        // set up the sticky for the first time
        instance.$("#manage-obj-detail").sticky({
          context: "#manage-obj-context",
          offset: 55,
          observeChanges: true,
          onReposition() {
            // NOTE: recursive
            Meteor.defer(refreshSticky);
          },
        });

        stickied = true;
      }
    } else {
      // destroy the sticky
      instance.$("#manage-obj-detail").sticky("destroy");

      // set some CSS that isn't cleared when the sticky is destroyed
      instance.$("#manage-obj-detail-container").css("min-height", "auto");

      stickied = false;
    }
  }

  // watch these reactive functions so it'll update
  // when they change, but don't do anything with the return value
  instance.autorun(() => {
    getObjects(instance).count();

    FlowRouter.getParam("selected");

    Meteor.defer(refreshSticky);
  });
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
});
