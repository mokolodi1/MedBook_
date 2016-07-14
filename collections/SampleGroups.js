SampleGroups = new Meteor.Collection("sample_groups");

var filterOptionsSchemas = {
  include_sample_list: new SimpleSchema({
    sample_labels: { type: [String] },
    sample_count: { type: Number },
  }),
  exclude_sample_list: new SimpleSchema({
    sample_labels: { type: [String] },
    sample_count: { type: Number },
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
        data_set_name: { type: String },

        sample_labels: { type: [String] },
        sample_count: {
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
        unfiltered_sample_count: { type: Number },

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
