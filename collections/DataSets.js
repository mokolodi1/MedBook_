// define options for value_type and schemas for the metadata field
// associated with each value_type
// NOTE: within `metadata_schema`, `label` must be defined for use
//       on the data set management page
MedBook.dataSetTypes = [
  {
    value_type: "gene_expression",
    label: "Gene expression",
    metadata_schema: {
      normalization: {
        type: String,
        allowedValues: [
          "raw_counts",
          "quan_norm_counts",
          "rsem",
          "tpm",
        ],
        autoform: {
          options: [
            { value: "raw_counts", label: "Raw counts" },
            { value: "quan_norm_counts", label: "Quantile normalized counts" },
            { value: "fpkm", label: "FPKM" },
            { value: "tpm", label: "TPM" },
          ]
        },
        label: "Normalization",
      },
      quantification_method: {
        type: String,
        allowedValues: [ "rsem" ],
        label: "Quantification method",
      },
      genome_assembly: {
        type: String,
        allowedValues: [
          "hg19",
          "hg38"
        ],
        label: "Genome assembly",
      },
      value_scaling: {
        type: String,
        allowedValues: [
          "none",
          "log2(x+1)",
        ],
        label: "Value scaling",
      },
      read_strandedness: {
        type: String,
        allowedValues: [
          "stranded",
          "unstranded",
          "unknown"
        ],
        label: "Read strandedness",
      },
      // TODO
      // - sequencing selection method (polyA)
      // - aligner used (STAR, TopHat)
    },
  },
  // isoform expression
  // exon counts
  // copy number (GISTIC)
  // signature scores
];

SimpleSchema.messages({
  "datasetMetadataInvalid": "Invalid data set metadata",
});

DataSets = new Meteor.Collection("data_sets");
DataSets.attachSchema(new SimpleSchema({
  // administrators: { type: [String] },
  collaborations: { type: [String] },

  name: { type: String },
  description: { type: String },

  value_type: {
    type: String,
    allowedValues: _.pluck(MedBook.dataSetTypes, "value_type"),
  },

  metadata: {
    type: Object,
    blackbox: true,
    custom: function () {
      var schemaObj = _.findWhere(MedBook.dataSetTypes, {
        value_type: this.field("value_type")
      });

      var isValid = new SimpleSchema(schemaObj)
          .newContext()
          .validate(this.value);

      if (!isValid) {
        return "datasetMetadataInvalid";
      }
    },
  },

  sample_labels: { type: [String], optional: true },

  // samples_index allows for quick referencing of the index of the sample in
  // the GenomicExpression collection. It is organized by study_label and then
  // sample_label.
  // Example usage:
  // `genomicExpressionIndex = dataSet[sampel_label];`
  // Example `sample_label_index`:
  // {
  //   "prad_wcdt/DTB-001": 0,
  //   "prad_wcdt/DTB-002": 1,
  //   "prad_wcdt/DTB-003": 2,
  //   "ckcc/K1_S1": 3,
  //   "ckcc/K2_S2": 4
  // }
  sample_label_index: {
    type: Object,
    defaultValue: {},
    blackbox: true,
    optional: true,
  },

  feature_labels: { type: [String], optional: true },

  // // TODO
  // provenance: {
  //   type: [new SimpleSchema({
  //     user_id: { type: String },
  //     first_name: { type: String },
  //     last_name: { type: String },
  //
  //     description: { type: String },
  //     date: { type: Date },
  //   })],
  // },

  // soft lock: true when someone is loading data into this data set
  currently_wrangling: { type: Boolean, defaultValue: false },
}));
