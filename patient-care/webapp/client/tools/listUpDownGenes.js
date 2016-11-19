// Template.listUpDownGenes

Template.listUpDownGenes.onCreated(function() {
  let instance = this;

  instance.customSampleGroup = new ReactiveVar();
  instance.error = new ReactiveVar(); // { header: "Uh oh", message: "hi" }

  instance.talkingToServer = new ReactiveVar(false);

  instance.subscribe("allOfCollectionOnlyMetadata", "DataSets");
  instance.subscribe("allOfCollectionOnlyMetadata", "SampleGroups");

  // subscribe to the selected data set's sample labels
  instance.autorun(() => {
    let dataSetId = AutoForm.getFieldValue("data_set_id",
        "createUpDownGenes");

    if (dataSetId) {
      instance.subscribe("dataSetSampleLabels", dataSetId);
    }
  });
});

Template.listUpDownGenes.helpers({
  formSchema() {
    return new SimpleSchema({
      data_set_id: {
        type: String,
        label: "Sample's data set"
      },
      sample_labels: { type: [String], label: "Samples" },
      sample_group_id: { type: String, label: "Background sample group" },
      iqr_multiplier: { type: Number, decimal: true },
      use_filtered_sample_group: {type: Boolean, label:
         "Apply gene filters to background sample group?", defaultValue:true},
    });
  },
  undefined() { return undefined; },
  patientAndDataSets() {
    return DataSets.find({}, { sort: { name: 1 } }).map((dataSet) => {
      return { value: dataSet._id, label: dataSet.name };
    });
  },
  sampleOptions() {
    let _id = AutoForm.getFieldValue("data_set_id", "createUpDownGenes");
    let dataSet = DataSets.findOne(_id);

    if (dataSet.sample_labels) {
      // http://stackoverflow.com/questions/8996963/
      // how-to-perform-case-insensitive-sorting-in-javascript
      let samples = dataSet.sample_labels.sort((a, b) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });

      return _.map(samples, (label) => {
        return { value: label, label };
      });
    }
  },
  sampleGroupOptions() {
    let query = SampleGroups.find({}, { sort: { name: 1 } });

    let sgOptions = query.map((sampleGroup) => {
      let sgLabel = `${sampleGroup.name} (v${sampleGroup.version})`;
      return { value: sampleGroup._id, label: sgLabel };
    });

    return [ {
      value: "creating",
      label: "Create new",
      icon: "plus icon"
    } ].concat(sgOptions);
  },
  customSampleGroup() { return Template.instance().customSampleGroup; },
  error() { return Template.instance().error; },
  talkingToServer() { return Template.instance().talkingToServer.get(); },
  previousJobsCols() {
    return [
      { title: "Sample", field: "args.sample_label" },
      { title: "Comparison group", field: "args.sample_group_name" },
      { title: "IQR", field: "args.iqr_multiplier" },
      {
        title: "Gene filters",
        field: "args.use_filtered_sample_group",
        yes_no: true
      },
      { title: "Up genes", field: "output.up_genes_count" },
      { title: "Down genes", field: "output.down_genes_count" },
    ];
  },
  multipleSamplesSelected() {
    let samples = AutoForm.getFieldValue("sample_labels", "createUpDownGenes");

    return samples && samples.length > 1;
  },
});

Template.listUpDownGenes.events({
  "submit #createUpDownGenes"(event, instance) {
    event.preventDefault();

    let formValues = AutoForm.getFormValues("createUpDownGenes");
    let customSampleGroup = instance.customSampleGroup.get();

    // until Match.Maybe is available, make sure this is an Object
    if (!customSampleGroup) customSampleGroup = {};

    instance.talkingToServer.set(true);
    Meteor.call("createUpDownGenes", formValues.insertDoc, customSampleGroup,
        (error, jobIds) => {
      instance.talkingToServer.set(false);

      if (error) {
        if (error.reason === "Match failed") {
          // there might be edge cases here which I haven't found yet so other
          // messages might have to be shown instead
          instance.error.set({ header: "Please correct errors above" });
        } else {
          instance.error.set({
            header: error.reason,
            message: error.details
          });
        }
      } else {
        if (jobIds.length === 1) {
          FlowRouter.go("upDownGenesJob", { job_id: jobIds[0] });
        }

        // reset form values
        AutoForm._forceResetFormValues("createUpDownGenes");
      }
    });
  },
});
