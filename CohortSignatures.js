CohortSignatures = new Meteor.Collection("cohort_signatures");

CohortSignatures.attachSchema(new SimpleSchema([
  Signatures.simpleSchema().pick([
    "type",
    "algorithm",
    "description",
    "label",
  ]),
  {
    signature_id: { type: Meteor.ObjectID, optional: true }, // should it be optional?

    samples: { // contains data
      type: [
        new SimpleSchema({
          study_label: { type: String },
          patient_label: { type: String, optional: true },
          sample_label: { type: String },
          value: { type: Number, decimal: true },
        })
      ]
    },

    gene_label: { type: String, optional: true },

    // input_data_normalization: {
    //   type: String,
    //   allowedValues: [
    //     "quantile_normalized_counts",
    //
    //   ],
    // },
    // input_data_type: {
    //   type: String,
    //   // allowedValues: [
    //   //   "RNA-Seq",
    //   //   "microarray",
    //   //   "RNA-Seq or microarray",
    //   //
    //   // ],
    // },
  }
]));
