// Template.siteBreadcrumbs

Template.siteBreadcrumbs.helpers({
  // getPatientLabel: function () {
  //   let patient = Patients.findOne(this.params().patient_id);
  //   if (patient) return patient.patient_label;
  //   return "loading";
  // },
  isJobResult() {
    return [
      "upDownGenesJob",
      "limmaGseaJob",
      "gseaJob",
      "pairedAnalysisJob",
      "limmaJob",
      "singleSampleTopGenesJob",
    ].indexOf(FlowRouter.getRouteName()) !== -1;
  },
  invalidUrl() {
    return !FlowRouter.getRouteName();
  },
});

// Template.chatWithUsOnSlack

Template.chatWithUsOnSlack.helpers({
  directSlackLink() {
    const user = Meteor.user();

    if (!user ||
        !user.profile ||
        !user.profile.patientCare ||
        !user.profile.patientCare.dismissedSlackExplanation) {
      return "";
    }

    return "https://medbook.slack.com";
  },
});

Template.chatWithUsOnSlack.onRendered(() => {
  function setChecked(checkedStatus) {
    Meteor.users.update(Meteor.userId(), {
      $set: {
        "profile.patientCare.dismissedSlackExplanation": checkedStatus
      }
    });
  }

  $(".ui.checkbox.dismiss-slack-explanation").checkbox({
    onChecked() { setChecked(true); },
    onUnchecked() { setChecked(false); },
  });
});

Template.chatWithUsOnSlack.events({
  "click .explain-slack-button"(event, instance) {
    // TODO: be able to not show again
    $(".ui.modal.explain-slack").modal("show");
  },
});

// Template.notificationsMenuItem

Template.notificationsMenuItem.onCreated(function () {
  let instance = this;

  // resubscribe when the userId changes
  instance.autorun(() => {
    if (Meteor.userId()) {
      instance.subscribe("notifications");
    }
  });

  // TODO: maybe set a notification about a page as "visited" when the
  // user visits that page
});

Template.notificationsMenuItem.onRendered(function () {
  let instance = this;

  // show the notifications popup
  instance.$("#view-notifications").popup({
    on: "click",
    position: "bottom center",
    duration: 100,
    onShow() {
      Meteor.call("viewedNotificationsList");
    },
  });
});

Template.notificationsMenuItem.helpers({
  unseenCount() {
    return Counts.get("unseen-notifications");
  },
  getNotifications() {
    let now = new Date();

    return Notifications.find({}, {
      sort: { date_created: -1 },
    });
  },
  formatDate(date) {
    return moment(date).fromNow();
  },
});

Template.notificationsMenuItem.events({
  "click .visit-notification"(event, instance) {
    Meteor.call("visitedNotification", this._id);

    instance.$("#view-notifications").popup("hide");
  },
});
