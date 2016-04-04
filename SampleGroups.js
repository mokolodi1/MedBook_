SampleGroups = new Meteor.Collection("sample_groups");

var sampleSchema = new SimpleSchema({
  study_label: { type: String },
  sample_label: { type: String },
});

SampleGroups.attachSchema(new SimpleSchema({
  collaborations: { type: [String] },

  date_created: { type: Date, autoValue: dateCreatedAutoValue },

  sample_group_label: { type: String },
  sample_group_version: { type: Number, min: 1 },
  // description: { type: String },

  samples: { type: [sampleSchema] },
  samples_count: {
    type: Number,
    min: 1,
    autoValue: function () {
      var samples = this.field("samples").value;
      if (samples) {
        return samples.length;
      }
    },
  },

  selected_studies: { // TODO: name?
    type: [
      new SimpleSchema({
        study_label: { type: String },
        filtered_samples: { type: [sampleSchema] },
        filtered_samples_count: {
          type: Number,
          min: 0,
          custom: function () {
            return requiredIfTrue.call(this,
                !!this.siblingField("filtered_samples").value);
          },
          autoValue: function () {
            var filteredSamples = this.siblingField("filtered_samples").value;
            if (filteredSamples) {
              return filteredSamples.length;
            }
          },
        },
        total_samples_count: { type: Number, min: 0 }, // before filtering

        filters: {
          type: [
            new SimpleSchema({
              type: {
                type: String,
                allowedValues: [
                  "CRF",
                  "sample_label_search",
                  "sample_label_list",
                  "has_gene_expression",
                  "has_isoform_expression",
                  // etc.
                ]
              },
              info: {
                type: Object,
                blackbox: true,
              }
            })
          ],
          optional: true, // not present ==> include all samples in a study
        },
      })
    ],
    optional: true,
  },
}));
