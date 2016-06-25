// define options for value_type and schemas for the metadata field
// associated with each value_type
// NOTE: `value` and `label` chosen to be compatible with AutoForm
MedBook.dataSetTypes = [
  {
    value: "gene_expression",
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
        }
      }
      // TODO: fill in the rest of the fields
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
  collaborations: { type: [String] },

  name: { type: String },
  description: { type: String },

  value_type: {
    type: String,
    allowedValues: _.pluck(MedBook.dataSetTypes, "value"),
  },

  metadata: {
    type: Object,
    blackbox: true,
    custom: function () {
      var schemaObj = _.findWhere(MedBook.dataSetTypes, {
        value: this.field("value_type")
      });

      var isValid = new SimpleSchema(schemaObj).newContext().validate(this.value);

      if (!isValid) {
        return "datasetMetadataInvalid";
      }
    },
  },

  samples: {
    type: [ new SimpleSchema({
      study_label: { type: String, regEx: labelRegex },
      sample_label: { type: String, regEx: labelRegex },
    }) ],
  },

  // Example `sample_index`:
  // {
  //   WCDT: { "DTB-001": 0, "DTB-002": 1, "DTB-003": 2 },
  //   CKCC: { "K1_S1": 3, "K2_S2": 4 }
  // }
  sample_index: {
    type: Object,
    defaultValue: {},
    blackbox: true,
  },

  feature_labels: { type: [String] },

  // soft lock: true when someone is loading data into this data set
  currently_wrangling: { type: Boolean, defaultValue: false },
}));
