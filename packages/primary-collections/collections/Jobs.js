Jobs = new Meteor.Collection("jobs");

// TODO: implement job schemas
// NOTE: attributes = name of jobs
var jobSchemas = {
  "ParseWranglerFile": null,
  "SubmitWranglerFile": null,
  "SubmitWranglerSubmission": null,
  "FinishWranglerSubmission": null,
  "ExportFile": null,
  "ReloadGenesCollection": null,
  "GeneTranscriptMappings": null,

  UpDownGenes: {
    args: new SimpleSchema({
      // can be patient_label or data set name
      data_set_name_or_patient_label: { type: String },
      data_set_id: { type: String },
      sample_label: { type: String },
      sample_group_id: { type: String },
      sample_group_name: { type: String },
      iqr_multiplier: { type: Number, decimal: true },
      use_filtered_sample_group: { type: Boolean, optional: true},
    }),
    output: null,
  },
  RunLimmaGSEA: {
    args: new SimpleSchema({
      sample_group_a_id: { type: String },
      sample_group_b_id: { type: String },
      sample_group_a_name: { type: String },
      sample_group_b_name: { type: String },
      limma_top_genes_count: { type: Number, min: 1 },
      gene_set_group_id: { type: String },
      gene_set_group_name: { type: String },
    }),
    output: null,
  },
  RunGSEA: null,
  RunPairedAnalysis: null,
  RunLimma: null,
  RunSingleSampleTopGenes: null,
  TumorMapOverlay: {
    args: new SimpleSchema({
      map: { type: String, allowedValues: [ "CKCC/v1" ] },
      layout: { type: String, allowedValues: [ "mRNA" ] },
      samples: {
        type: [new SimpleSchema({
          data_set_id: { type: String, label: "Data set" },
          data_set_name: { type: String },
          sample_label: { type: String, label: "Sample" },
        })],
        minCount: 1,
      },
    }),
    output: new SimpleSchema({
      bookmark_url: { type: String },
    }),
  },
  UpdateCbioSecurity: {
    args: new SimpleSchema({
      collab_names: { type: [String] },
    }),
  },
  ApplyExprAndVarianceFilters: {
    args: new SimpleSchema({
      sample_group_id: { type: String},
    }),
    output: new SimpleSchema({
      filtered_samples_blob_id: { type: String},
    }),
  },
};
MedBook.jobSchemas = jobSchemas;

Jobs.attachSchema(new SimpleSchema({
  // fields needed to insert a Job
  name: {
    type: String,
    // TODO: depend on Jobs package
    allowedValues: Object.keys(jobSchemas),
  },
  user_id: { type: Meteor.ObjectID }, // TODO: remove?

  // administrators: { type: [String] },
  collaborations: { type: [String], defaultValue: [] },

  args: { // input
    type: Object,
    blackbox: true,
  },

  timeout_length: {
    type: Number,
    defaultValue: 7 * 24 * 60 * 60 * 1000, // a week
  },

  // optional fields
  prerequisite_job_ids: {
    type: [Meteor.ObjectID],
    defaultValue: [],
  },

  output: {
    type: Object,
    blackbox: true,
    optional: true,
  },

  // automatically generated fields
  date_created: { type: Date, autoValue: dateCreatedAutoValue },
  date_modified: { type: Date, autoValue: dateModifiedAutoValue },
  status: {
    type: String,
    allowedValues: [
      "creating",
      "waiting",
      "running",
      "done",
      "error",
    ],
    defaultValue: "waiting",
  },
  retry_count: { type: Number, defaultValue: 0 },
  // can be set even if status is not "error"
  error_description: { type: String, optional: true },
  stack_trace: { type: String, optional: true },
}));
