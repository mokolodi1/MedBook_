SampleGroups = new Meteor.Collection("sample_groups");

// Filter types:
// "CRF",
// "sample_label_search",
// "sample_label_list",
// // etc.

// attribute = filter["type"]
var studySampleTuple = {
  study_label: { type: String },
  sample_label: { type: String },
};

var filterOptionsSchemas = {
  include_sample_list: new SimpleSchema({
    samples: {
      type: [ new SimpleSchema(studySampleTuple) ]
    },
  }),
  exclude_sample_list: new SimpleSchema({
    samples: {
      type: [ new SimpleSchema(studySampleTuple) ]
    },
  }),
};

SimpleSchema.messages({
  filterOptionsInvalid: "Options provided in a filter are invalid",
});

SampleGroups.attachSchema(new SimpleSchema({
  name: { type: String },
  version: { type: Number, min: 1 },

  // only optinal because SimpleSchema causes problems when validating a
  // single object using a context
  date_created: {
    type: Date,
    autoValue: dateCreatedAutoValue,
    optional: true
  },

  // administrators: { type: [String] },
  collaborations: { type: [String] },

  value_type: DataSets.simpleSchema().schema().value_type,

  data_sets: {
    type: [
      new SimpleSchema({
        data_set_id: { type: String },

        samples: { type: [String] },
        samples_count: {
          type: Number,
          min: 0,
          custom: function () {
            return requiredIfTrue.call(this,
                !!this.siblingField("samples").value);
          },
          autoValue: function () {
            var filteredSamples = this.siblingField("samples").value;
            if (filteredSamples) {
              return filteredSamples.length;
            }
          },
        },

        filters: {
          type: [ new SimpleSchema({
            type: {
              type: String,
              allowedValues: Object.keys(filterOptionsSchemas),
            },
            options: {
              type: Object,
              blackbox: true,
              custom: function () {
                var type = this.siblingField("type").value;
                var isValid = filterOptionsSchemas[type]
                    .newContext()
                    .validate(this.value);

                if (!isValid) {
                  return "filterOptionsInvalid";
                }
              },
            },
          }) ],
          defaultValue: [],
          optional: true, // TODO: remove
        },
      })
    ],
    min: 1
  },
}));
