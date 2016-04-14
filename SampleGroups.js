SampleGroups = new Meteor.Collection("sample_groups");

SampleGroups.attachSchema(new SimpleSchema({
  collaborations: { type: [String] },

  date_created: { type: Date, autoValue: dateCreatedAutoValue },

  name: { type: String },
  version: { type: Number, min: 1 },

  // samples: {
  //   type: [
  //     new SimpleSchema({
  //       study_label: { type: String },
  //       sample_labels: { type: [String] },
  //     })
  //   ]
  // },
  // samples_count: {
  //   type: Number,
  //   min: 1,
  //   autoValue: function () {
  //     var samples = this.field("samples").value;
  //     if (samples) {
  //       return samples.length;
  //     }
  //   },
  // },

  studies: {
    type: [
      new SimpleSchema({
        study_label: { type: String },
        sample_labels: { type: [String] },
        sample_labels_count: {
          type: Number,
          min: 0,
          custom: function () {
            return requiredIfTrue.call(this,
                !!this.siblingField("sample_labels").value);
          },
          autoValue: function () {
            var filteredSamples = this.siblingField("sample_labels").value;
            if (filteredSamples) {
              return filteredSamples.length;
            }
          },
        },
        // unfiltered_samples_count: {
        //   type: Number,
        //   min: 0,
        //   optional: true,
        // },

        // filters: {
        //   type: [
        //     new SimpleSchema({
        //       type: {
        //         type: String,
        //         allowedValues: [
        //           "CRF",
        //           "sample_label_search",
        //           "sample_label_list",
        //           "has_gene_expression",
        //           "has_isoform_expression",
        //           // etc.
        //         ]
        //       },
        //       info: {
        //         type: Object,
        //         blackbox: true,
        //       }
        //     })
        //   ],
        //   optional: true, // not present ==> include all samples in a study
        // },
      })
    ],
    optional: true,
  },
}));
