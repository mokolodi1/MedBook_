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
    var collaborators = Template.instance().currObj.get()[this.editingField];
    return _.filter(collaborators, lodash.negate(isPersonal));
  },
  personalCollabs: function () {
    var collaborators = Template.instance().currObj.get()[this.editingField];
    return _.filter(collaborators, isPersonal);
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

    if (removeClicked.get()) {
      var singleObject = instance.parent(2).data;

      // check to see if they're goig to still have access afterwards
      var tryRemove = instance.parent(2).currObj.get(); // test object
      var removeName = instance.data.collab;
      var editingField = singleObject.editingField;
      var removeIndex = tryRemove[editingField].indexOf(removeName);
      tryRemove[editingField].splice(removeIndex, 1); // remove it

      var user = MedBook.findUser(Meteor.userId());

      // if they're not going to have access, make sure they're okay with that
      var scaryMessage = null;
      if (editingField === "collaborations") { // regular object
        // TODO: figure out a better word for "object"
        if (!user.hasAccess(tryRemove)) {
          scaryMessage = "After removing this collaboration, " +
              "you will no longer have access to this object. Are you sure " +
              "you want to continue?";
        }
      } else if (editingField === "administrators") {
        if (!user.isAdmin(tryRemove)) {
          scaryMessage = "After removing this collaboration, " +
              "you will no longer be an administrator. Are you sure " +
              "you want to continue?";
        }
      } else if (editingField === "collaborators") {
        // that's okay: they can always add themselves back, right?
      }

      // show the scary message (if present) and cancel if they get scared
      if (scaryMessage) {
        var stillRemove = window.confirm(scaryMessage);
        if (!stillRemove) {
          removeClicked.set(false);
          return; // quit
        }
      }

      // actually do the remove
      var singleObject = instance.parent(2).data;
      Meteor.call("/collaborations/pullCollaborator",
          singleObject, instance.data.collab, function (error, result) {
        if (error && error.error === "no-collaborators-would-remain") {
          alert("You cannot remove the last " + editingField.slice(0, -1) +
              " from the object as no one would have access to it. " +
              "To delete the object, use the delete button.");
        }
      });

      // hide the modal if they no longer have access
      if (scaryMessage) {
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
    Meteor.call("/collaborations/pushCollaborator",
        singleObject, instance.data.collab);

    // close search thing
    instance.parent(2).searchCollabShow.set(false);
    $("#collabs-search")[0].value = "";
    // set this because there's no "keyup" event to reset it
    instance.parent(2).searchCollabText.set("");
  },
});

// Template.collabsModalTitle

Template.collabsModalTitle.helpers({
  currObj: function () {
    return Template.instance().parent().currObj.get();
  },
});
