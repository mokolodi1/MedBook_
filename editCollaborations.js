// bring up the modal that allows you to edit the collaborations of an object
MedBook.editCollaborations = function (collectionString, objectId) {
  var singleObject = {
    collectionString: collectionString,
    objectId: objectId,
  };
  check(singleObject, singleObjectSchema);

  Modal.show("collabsEditCollaborations", singleObject, {
    keyboard: false // don't close on ESC key
  });
};

// Template.collabsEditCollaborations

Template.collabsEditCollaborations.onCreated(function () {
  var instance = this;

  // subscribe to object we're looking at
  instance.singleObjectSub =
      instance.subscribe("/collaborations/singleObject", instance.data);

  // reactively set instance.currObj to be the object we're working with
  instance.currObj = new ReactiveVar(null);
  instance.autorun(function () {
    var collection =
        MedBook.Collections[Template.currentData().collectionString];
    instance.currObj.set(collection.findOne({_id: instance.data.objectId}));
  });

  // whether #collabs-search is focussed
  instance.searchCollabShow = new ReactiveVar(false);
  // the text in #collabs-search
  instance.searchCollabText = new ReactiveVar("");

  // subscribe to users collection
  instance.usersSub = new ReactiveVar(null);

  // debounce the subscription: wait until input stops arriving
  var updateUsersSubscribe = _.debounce(function (text) {
    var searchCollabText = instance.searchCollabText.get();
    // stay subscribed even when searchCollabShow is false
    if (searchCollabText.length > 0) {
      var subscription =
          instance.subscribe("/collaborations/searchUsers", searchCollabText);
      instance.usersSub.set(subscription);
    }
  }, 350);

  instance.autorun(function () {
    var text = instance.searchCollabText.get(); // so that it updates
    updateUsersSubscribe(text);
  });
});

function isPersonal (collabName) {
  return collabName.startsWith("user:");
}

// fuzzy search algorithm from: http://stackoverflow.com/a/15252131/1092640
function fuzzySearch (text, query) {
    var hay = text.toLowerCase();
    var n = -1; // unclear what this does
    query = query.toLowerCase();
    for (var index in query) {
      var letter = query[index];
      if (!~(n = hay.indexOf(letter, n + 1))){
        return false;
      }
    }
    return true;
}

Template.collabsEditCollaborations.helpers({
  // subscription helpers
  loadedObject: function () {
    return Template.instance().singleObjectSub.ready();
  },
  usersSubReady: function () {
    var usersSub = Template.instance().usersSub.get();
    if (usersSub) {
      return usersSub.ready();
    }
  },

  // collaboration helpers
  nonPersonalCollabs: function () {
    var collaborations = Template.instance().currObj.get().collaborations;
    return _.filter(collaborations, lodash.negate(isPersonal));
  },
  personalCollabs: function () {
    var collaborations = Template.instance().currObj.get().collaborations;
    return _.filter(collaborations, isPersonal);
  },
  searchCollaborations: function () {
    var memberOf = Meteor.user().collaborations.memberOf;

    var searchCollabText = Template.instance().searchCollabText.get();

    // filter down the collaborations the user is a member of
    var filtered = _.filter(memberOf, function (collabName) {
      // don't want the user's personal collaboration
      if (isPersonal(collabName)) {
        return false;
      }

      // use a fuzzy search
      if (fuzzySearch(collabName, searchCollabText)) {
        return true;
      }

      // reject if it doesn't match the fuzzy search
      return false;
    });

    return filtered;
  },
  searchUsers: function () {
    var searchCollabText = Template.instance().searchCollabText.get();
    return findUsersPersonalCollabs(searchCollabText).map(function (doc) {
      return doc.collaborations.personal;
    });
  },

  // other helpers
  searchBlank: function () {
    return Template.instance().searchCollabText.get() === "";
  },
  searchCollabShow: function () {
    return Template.instance().searchCollabShow.get();
  },
  bothEmpty: function (firstCursor, secondCursor) {
    return firstCursor.length === 0 && secondCursor.length === 0;
  },
});

Template.collabsEditCollaborations.events({
  "keyup #collabs-search": function (event, instance) {
    event.preventDefault();

    // just in case (ex. press enter and then keep typing)
    instance.searchCollabShow.set(true);

    // blur on ESC key, otherwise update searchCollabText
    if (event.keyCode === 27) {
      instance.searchCollabShow.set(false);
    } else {
      instance.searchCollabText.set(event.target.value);
    }
  },
  "focus #collabs-search": function (event, instance) {
    instance.searchCollabShow.set(true);
  },
  "click #cancel-search": function (event, instance) {
    instance.searchCollabShow.set(false);
  },
});

// Template.collabsListCollabs

Template.collabsListCollabs.helpers({
  button: function () { // for use within the #each
    return Template.instance().data.button;
  },
});

// Template.collabsDisplayCollab

Template.collabsDisplayCollab.onCreated(function () {
  var instance = this;

  instance.removeClicked = new ReactiveVar(false);
});

Template.collabsDisplayCollab.helpers({
  trimUserIfNecessary: function (collab) {
    if (collab.startsWith("user:")) {
      return collab.slice(5);
    }
    return collab;
  },
});

Template.collabsDisplayCollab.events({
  "click .remove-collab": function (event, instance) {
    var removeClicked = instance.removeClicked;

    function actuallyRemove() {

    }

    if (removeClicked.get()) {
      // check to see if they're goig to still have access afterwards
      var tryRemove = instance.parent(2).currObj.get(); // test object
      var removeName = instance.data.collab;
      var removeIndex = tryRemove.collaborations.indexOf(removeName);
      tryRemove.collaborations.splice(removeIndex, 1); // remove it

      var user = MedBook.findUser(Meteor.userId());

      // if they're not going to have access, make sure they're okay with that
      var accessAfterwards = user.hasAccess(tryRemove);
      if (!accessAfterwards) {
        var stillRemove = window.confirm("After removing this collaboration, " +
            "you will no longer have access to the object. Are you sure " +
            "you want to continue?");
        if (!stillRemove) {
          removeClicked.set(false);
          return; // quit
        }
      }

      // actually do the remove
      var singleObject = instance.parent(2).data;
      Meteor.call("/collaborations/removeCollab",
          singleObject, instance.data.collab);

      // hide the modal if they no longer have access
      if (!accessAfterwards) {
        Modal.hide(instance.parent(2));
      }
    } else {
      removeClicked.set(true);

      // wait until propogation finishes before registering event handler
      Meteor.defer(function () {
        $("html").one("click",function() {
          removeClicked.set(false);
        });
      });
    }
  },
  "click .add-collab": function (event, instance) {
    var singleObject = instance.parent(2).data;
    Meteor.call("/collaborations/addCollab",
        singleObject, instance.data.collab);

    // close search thing
    instance.parent(2).searchCollabShow.set(false);
    $("#collabs-search")[0].value = "";
    // set this because there's no "keyup" event to reset it
    instance.parent(2).searchCollabText.set("");
  },
});

// Template.collabsDescriptionText

Template.collabsDescriptionText.helpers({
  currObj: function () {
    return Template.instance().parent().currObj.get();
  },
  collectionString: function () { // for use within a #with
    return Template.instance().data.collectionString;
  },
});
