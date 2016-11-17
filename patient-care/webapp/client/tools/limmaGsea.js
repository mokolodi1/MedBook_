// Template.listLimmaGSEA

Template.listLimmaGSEA.helpers({
  previousJobsCols() {
    return [
      { title: "Reference group", field: "args.sample_group_a_name" },
      { title: "Experimental group", field: "args.sample_group_b_name" },
      {
        title: "Top genes count for Limma",
        field: "args.limma_top_genes_count"
      },
      { title: "Gene sets", field: "args.gene_set_group_name" },
    ];
  },
});

// Template.limmaGseaJob

Template.limmaGseaJob.onCreated(function () {
  let instance = this;

  // subscribe and keep up to date
  instance.autorun(function () {
    instance.subscribe("specificJob", Template.currentData().job_id);
  });
});

Template.limmaGseaJob.helpers({
  getJobResultUrl: function() {
    let userId = Meteor.userId();
    let loginToken = Accounts._storedLoginToken();
    let jobId = FlowRouter.getParam("job_id");

    return `/download/${userId}/${loginToken}/job-blob/${jobId}/index.html`;
  },
  jobOptions() {
    return {
      job_id: FlowRouter.getParam("job_id"),
      title: "Limma GSEA Result",
      listRoute: "listLimmaGSEA",
    };
  },
});

Template.limmaGseaJob.events({
  "click .gsea-iframe-new-tab"(event, instance) {
    // open the current iFrame URL in a new tab: magic!
    window.open($("#gsea-report").contents().get(0).location.href,'_blank');
  },
});
