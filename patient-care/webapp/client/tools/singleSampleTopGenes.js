// Template.listSingleSampleTopGenes

AutoForm.addHooks("createSingleSampleTopGenes", {
  onSuccess(formType, jobIds) {
    // foward to job page if they specified only one sample
    if (jobIds.length === 1) {
      FlowRouter.go("singleSampleTopGenesJob", {
        job_id: jobIds[0]
      });
    }

    // reset form values
    AutoForm._forceResetFormValues("createSingleSampleTopGenes");
  },
});

Template.listSingleSampleTopGenes.onCreated(function () {
  let instance = this;

  // first only subscribe to the name
  instance.subscribe("allOfCollectionOnlyMetadata", "DataSets");

  instance.autorun(() => {
    let dataSetId = AutoForm.getFieldValue("data_set_id",
        "createSingleSampleTopGenes");

    if (dataSetId) {
      instance.subscribe("dataSetSampleLabels", dataSetId);
    }
  });
});

Template.listSingleSampleTopGenes.helpers({
  schema() {
    return new SimpleSchema({
      // data_set_name set on the server
      data_set_id: { type: String, label: "Data set" },
      sample_labels: { type: [String], label: "Sample(s)" },
      percent_or_count: {
        type: String,
        allowedValues: [
          "percent",
          "count",
        ],
        label: "Filter top genes by percent or count?"
      },
      top_percent: {
        type: Number,
        optional: true,
        custom() {
          if (!this.isSet &&
              this.field("percent_or_count").value === "percent") {
            return "required";
          }
        },
        min: 0.001,
        max: 100,
        decimal: true,
      },
      top_count: {
        type: Number,
        optional: true,
        custom() {
          if (!this.isSet &&
              this.field("percent_or_count").value === "count") {
            return "required";
          }
        },
        min: 1,
      },
    });
  },
  loadingIfFalse(boolean) {
    if (!boolean) {
      return "loading";
    }
  },
  dataSetOptions() {
    return DataSets.find({}).map((dataSet) => {
      return {
        label: dataSet.name,
        value: dataSet._id,
      };
    });
  },
  sampleOptions() {
    let dataSetId = AutoForm.getFieldValue("data_set_id",
        "createSingleSampleTopGenes");
    if (!dataSetId) { return false; }

    // make sure the sample labels are loaded
    let { sample_labels } = DataSets.findOne(dataSetId);
    if (!sample_labels) { return false; }

    return sample_labels.sort().map((label) => {
      return { label, value: label };
    });
  },
  multipleSamplesSelected() {
    let sampleLabels = AutoForm.getFieldValue("sample_labels",
        "createSingleSampleTopGenes");

    return sampleLabels && sampleLabels.length > 1;
  },
  previousJobsCols() {
    return [
      {
        title: "Data set",
        field: "args.data_set_name",
      },
      {
        title: "Sample",
        field: "args.sample_label",
      },
      {
        title: "Top amount",
        func: function ({ args }) {
          if (args.percent_or_count === "percent") {
            return `${args.top_percent}% of genes`;
          } else {
            return `${args.top_count} genes`;
          }
        },
        fields: [
          "args.top_count",
          "args.top_percent",
          "args.percent_or_count",
        ],
      },
    ];
  },
});

// Template.singleSampleTopGenesJob

Template.singleSampleTopGenesJob.onCreated(function () {
  let instance = this;

  instance.hotPassback = {
    initialized: new ReactiveVar(false),
  };
});

Template.singleSampleTopGenesJob.helpers({
  jobOptions() {
    return {
      job_id: FlowRouter.getParam("job_id"),
      title: "Single Sample Top Genes Result",
      listRoute: "listSingleSampleTopGenes",
      argsTemplate: "singleSampleTopGenesArgs",
    };
  },
  hotPassback() {
    return Template.instance().hotPassback;
  },
  filename() {
    let { args } = this;

    let topAmount;
    if (args.percent_or_count === "percent") {
      topAmount = `${args.top_percent}% of genes`;
    } else {
      topAmount = `${args.top_count} genes`;
    }

    return `Top ${topAmount} in ${args.sample_label}`;
  },
});

Template.singleSampleTopGenesJob.events({
  "click .run-gsea"(event, instance) {
    // pass the gene set to the modal via a query
    FlowRouter.setQueryParams({
      "geneSetIdForGsea": GeneSets.findOne()._id
    });
  },
});

// Template.showGeneSetAssociatedWithJob

Template.showGeneSetAssociatedWithJob.onCreated(function () {
  let instance = this;

  instance.subscribe("associatedObjectGeneSet", {
    collection_name: "Jobs",
    mongo_id: instance.data.job._id,
  });
});

Template.showGeneSetAssociatedWithJob.helpers({
  getGeneSet() {
    // it should be the only one loaded...
    if (GeneSets.find().count() > 1) {
      throw "More than one gene set!";
    }

    return GeneSets.findOne();
  },
});
