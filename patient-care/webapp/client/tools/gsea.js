// Template.listGsea

Template.listGsea.helpers({
  previousJobsCols() {
    return [
      { title: "Gene set name", field: "args.gene_set_name" },
      { title: "Ranking field", field: "args.gene_set_sort_field" },
      {
        title: "Gene sets",
        func: function (job) {
          return job.args.gene_set_group_names.join("<br>");
        },
        fields: [ "args.gene_set_group_names" ],
      },
    ];
  },
});

// Template.createGseaForm

AutoForm.addHooks([ "createGsea", "createGseaFromOutlierAnalysis" ], {
  onSuccess(formType, job_id) {
    FlowRouter.go("gseaJob", { job_id });
  },
});

Template.createGseaForm.onCreated(function () {
  let instance = this;

  // grab the gene set id either from the current data or the form
  instance.geneSetId = new ReactiveVar();
  instance.autorun(() => {
    // Define both of these up here because if the reactive code doesn't run
    // the autorun won't rerun when it changes.
    let data = Template.currentData();
    let selectedGeneSetId = AutoForm.getFieldValue("gene_set_id",
        data.autoformId);

    if (data.gene_set_id) {
      instance.geneSetId.set(data.gene_set_id);
    } else {
      instance.geneSetId.set(selectedGeneSetId);
    }
  });

  // Subscribe to the necessary info in order to show the form, but only
  // load the data when the form is active. (See HTML note for more details.)
  instance.autorun(() => {
    let data = Template.currentData();

    if (data.active) {
      instance.subscribe("gseaFormData", data.gene_set_id);
    }
  });

  // Subscribe to the gene set fields (to select) and
  // gene labels (for validation).
  instance.autorun(() => {
    let data = Template.currentData();
    let geneSetId = instance.geneSetId.get();

    if (data.active && geneSetId) {
      // get the gene set id and subscribe to the gene set
      instance.subscribe("objectFromCollection", "GeneSets", geneSetId);
    }
  });
});

Template.createGseaForm.onRendered(function () {
  let instance = this;

  instance.$('.ui.accordion').accordion();

  instance.$(".help.circle.icon").popup({
    position: "bottom left",
    hoverable: true,
  });
});

Template.createGseaForm.helpers({
  loadingIfFalse(boolean) {
    if (!boolean) {
      return "loading";
    }

    // In order to show the duplicate gene set names warning message this
    // class has to be on the form according to Semantic UI.
    return "warning";
  },
  createGseaSchema() {
    // NOTE: these labels are also in gseaJob.html
    return new SimpleSchema({
      gene_set_id: {
        type: String,
        label: "Signature"
      },
      gene_set_sort_field: {
        type: String,
        label: "Signature sort field"
      },
      gene_set_group_ids: { type: [String], label: "Gene set groups" },
      set_max: { type: Number, min: 25, label: "Max size gene set" },
      set_min: { type: Number, min: 1, label: "Min size gene set" },
      plot_top_x: { type: Number, min: 1, label: "Top pathways count" },
      nperm: { type: Number, min: 1, label: "Permutation count" },
      metric: {
        type: String,
        label: "Gene rank metric",
        allowedValues: [
          "Signal2Noise",
          "tTest",
          "Ratio_of_Classes",
          "Diff_of_Classes",
          "log2_Ratio_of_Classes",
          "Pearson",
          "Cosine",
          "Manhattan",
          "Euclidean",
        ],
      },
      scoring_scheme: {
        type: String,
        label: "Scoring statistic",
        allowedValues: [
          "classic",
          "weighted",
          // NOTE: weighted_p3333 not supported right now
        ],
      },
    });
  },
  geneSetGroupOptions() {
    return GeneSetGroups.find({}).map((geneSetGroup) => {
      return {
        value: geneSetGroup._id,
        label: geneSetGroup.name,
      };
    });
  },
  geneSetOptions() {
    return GeneSets.find({}).map((geneSet) => {
      return {
        value: geneSet._id,
        label: geneSet.name,
      };
    });
  },
  availableSortFields() {
    let geneSetId = Template.instance().geneSetId.get();

    // if the gene set id hasn't been selected, return false
    if (!geneSetId) {
      return false;
    }

    let geneSet = GeneSets.findOne(geneSetId);

    if (geneSet) {
      return _.chain(geneSet.fields)
        .filter((field) => {
          return field.value_type === "Number";
        })
        .map((field) => {
          return {
            value: field.name,
            label: field.name,
          };
        })
        .value();
    }
  },
  // return true if there are duplicate gene set names in the union of the
  // selected gene set groups
  // TODO: test
  duplicateGeneSetNames() {
    let geneSetGroupIds =
        AutoForm.getFieldValue("gene_set_group_ids", this.autoformId);

    // if there's no gene set groups selected, return false
    if (!geneSetGroupIds) { return false; }

    // count all gene set names and all unique gene set names
    let allNamesAsAttributes = {};
    let allNamesCount = 0;

    // gsg = gene set group
    GeneSetGroups.find({ _id: { $in: geneSetGroupIds } }).map((gsg) => {
      _.each(gsg.gene_set_names, (geneSetName) => {
        allNamesAsAttributes[geneSetName] = true;
      });

      allNamesCount += gsg.gene_set_names.length;
    });

    return Object.keys(allNamesAsAttributes).length !== allNamesCount;
  },
});


// Template.gseaJob

Template.gseaJob.helpers({
  jobOptions() {
    return {
      job_id: FlowRouter.getParam("job_id"),
      title: "GSEA Result",
      listRoute: "listGsea",
      argsTemplate: "gseaJobArgs",
    };
  },
  getJobResultUrl: function(fileName) {
    let userId = Meteor.userId();
    let loginToken = Accounts._storedLoginToken();
    let jobId = FlowRouter.getParam("job_id");

    return `/download/${userId}/${loginToken}/job-blob/${jobId}/${fileName}`;
  },
});

Template.gseaJob.events({
  "click .gsea-iframe-new-tab"(event, instance) {
    // open the current iFrame URL in a new tab: magic!
    window.open($("#gsea-report").contents().get(0).location.href,'_blank');
  },
});

// Template.gseaJobArgs

Template.gseaJobArgs.helpers({
  getGeneSetGroupId(index, job) {
    // sometimes only part of the object is loaded
    if (job.args.gene_set_group_ids) {
      return job.args.gene_set_group_ids[index];
    }
  },
  geneSetAssociatedObj() {
    return {
      mongo_id: this.args.gene_set_id,
      collection_name: "GeneSets",
    };
  },
});

// Template.linkToGeneSet

Template.linkToGeneSet.onCreated(function () {
  let instance = this;

  instance.subscribe("geneSetParentObj", instance.data.valueOf());
});

Template.linkToGeneSet.helpers({
  geneSetUrl() {
    let geneSetId = this.valueOf();
    let geneSet = GeneSets.findOne(geneSetId);

    if (geneSet) {
      // send them to a different page depending on the parent object
      let { collection_name, mongo_id } = geneSet.associated_object;

      let parentObject = MedBook.collections[collection_name].findOne(mongo_id);

      if (collection_name === "Jobs") {
        let query = { geneSetIdForGsea: geneSetId };

        if (parentObject.name === "RunLimma") {
          return FlowRouter.path("limmaJob", { job_id: mongo_id }, query);
        } else if (parentObject.name === "RunSingleSampleTopGenes") {
          return FlowRouter.path("singleSampleTopGenesJob",
              { job_id: mongo_id }, query);
        } else if (parentObject.name === "UpDownGenes") {
          return FlowRouter.path("upDownGenesJob", { job_id: mongo_id }, query);
        }
      }
    }

    // If there's no gene set loaded or we don't know where to send them,
    // send them to the manage gene sets page. Worst case scenario they
    // see a permission denied message.
    return FlowRouter.path("manageObjects", {
      collectionSlug: "gene-sets",
      selected: geneSetId,
    });
  },
});
