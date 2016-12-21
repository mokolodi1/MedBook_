// Template.listCharts

Template.listCharts.onCreated(function () {
  let instance = this;

  instance.subscribe("listCharts");
});

Template.listCharts.helpers({
  getCharts() {
    return Charts.find({}, {
      sort: { date_modified: -1 }
    });
  },
  formatDate(date) {
    // If more than a day ago, format with date. Otherwise with
    // "5 hours ago", "a few seconds ago", etc.
    if (new Date() - date > 24 * 60 * 60 * 1000) {
      return moment(date).format("MMM Do, YYYY");
    } else {
      return moment(date).fromNow();
    }
  },
});

Template.listCharts.events({
  "click .create-chart"(event, instance) {
    Meteor.call("createChart", function (error, chart_id) {
      if (!error) {
        FlowRouter.go("editChart", { chart_id });
      }
    });
  },
});
