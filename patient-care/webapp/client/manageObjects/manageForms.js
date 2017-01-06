// Template.viewFormRecords

Template.viewFormRecords.onCreated(function () {
  let instance = this;

  let formId = FlowRouter.getParam("form_id");
  instance.subscribe("objectFromCollection", "Forms", formId);

  instance.hotPassback = {
    initialized: new ReactiveVar(false),
  };
});

Template.viewFormRecords.helpers({
  getForm() {
    return Forms.findOne(FlowRouter.getParam("form_id"));
  },
  hotPassback() {
    return Template.instance().hotPassback;
  },
});
