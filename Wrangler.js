Wrangler = {};

// var requiredOnCreate = function () {
//   if (this.field("update_or_create").value === "create") {
//     // inserts
//     if (!this.operator) {
//       if (!this.isSet || this.value === null || this.value === "") return "required";
//     }
//
//     // updates
//     else if (this.isSet) {
//       if (this.operator === "$set" && this.value === null || this.value === "") return "required";
//       if (this.operator === "$unset") return "required";
//       if (this.operator === "$rename") return "required";
//     }
//   }
// };
//
// var update_or_create = {
//   type: String,
//   allowedValues: [
//     "update",
//     "create",
//   ],
//   label: "Update or create",
// };

Wrangler.fileTypes = {
  // PatientSampleMapping: {
  //   description: "Patient sample mapping",
  //   schema: new SimpleSchema({
  //     study_label: { type: String },
  //   }),
  // },
  // SampleLabelDefinition: {
  //   description: "Sample ID definition",
  //   schema: new SimpleSchema({
  //     study_label: { type: String },
  //   }),
  // },
  RectangularGeneExpression: {
    description: "Gene expression rectangular matrix",
    schema: new SimpleSchema({
      data_set_id: { type: String },
      normalization: {
        type: String,
        // TODO: autogenerate these
        allowedValues: [
          "rsem_quan_log2",
          "quantile_counts",
        ],
        autoform: {
          options: [
            {
              value: "rsem_quan_log2",
              label: "Quantile normalized counts log2(x+1)",
            },
            {
              value: "quantile_counts",
              label: "Quantile normalized counts",
            },
          ],
        },
      }
    }),
  },
  GeneSetCollection: {
    description: "Gene sets file (.gmt)",
    schema: new SimpleSchema({
      name: { type: String },
      description: { type: String },
    }),
  },
  ClinicalForm: {
    description: "Clinical form",
    schema: new SimpleSchema({
      study_label: { type: String, label: "Study" },
      form_name: { type: String },
      sample_label_field: {
        type: String,
        label: "Sample ID field",
        optional: true
      },
    }),
  },

  // RectangularIsoformExpression: {
  //   description: "Isoform expression rectangular matrix",
  //   schema: makeExpressionSchema(IsoformExpression),
  // },
  // "RectangularGeneAnnotation": {
  //   description: "Gene annotation rectangular matrix",
  //   schema: makeAnnotationSchema(GeneAnnotation, [
  //     "gistic_copy_number"
  //   ]),
  // },
  //
  // ContrastMatrix: {
  //   description: "Contrast matrix",
  //   schema: new SimpleSchema({
  //     collaboration_label: { type: String },
  //     update_or_create: update_or_create,
  //     contrast_label: { type: String, label: "Contrast name" },
  //     description: {
  //       type: String,
  //       optional: true,
  //       custom: requiredOnCreate
  //     },
  //   }),
  // },
  // LimmaSignature: {
  //   description: "Limma signature",
  //   schema: new SimpleSchema({
  //     collaboration_label: { type: String },
  //     update_or_create: update_or_create,
  //     signature_label: { type: String, label: "Signature name" },
  //     description: {
  //       type: String,
  //       optional: true,
  //       custom: requiredOnCreate
  //     },
  //     algorithm: _.extend(Signatures.simpleSchema().schema().algorithm, {
  //       optional: true,
  //       custom: requiredOnCreate,
  //     }),
  //     features_type: _.extend(Signatures.simpleSchema().schema().features_type, {
  //       optional: true,
  //       custom: requiredOnCreate,
  //     }),
  //   }),
  // },
  // MutationVCF: {
  //   description: "VCF Mutation",
  //   schema: new SimpleSchema({
  //     collaboration_label: { type: String },
  //     description: {
  //       type: String,
  //       optional: true,
  //       custom: requiredOnCreate
  //     },
  //   }),
  // },

  // // NOTE: people can still run it, but the client picklist won't show it
  // ArachneRegulon: {
  //   description: "Arachne generated adjacancy matrix weighted by mutual information",
  //   schema: new SimpleSchema({
  //     network_name: {
  //       type: String, // TODO: add some kind of autocomplete
  //     },
  //   }),
  // }
};
