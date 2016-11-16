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
