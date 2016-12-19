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
  form_values: new SimpleSchema({
    form_id: { type: String },

    // Use JSON.parse & JSON.stringify to translate
    mongo_query: { type: String},

    // TODO: perhaps?
    // matching_sample_count: { type: Number },
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

  sample_labels: { type: [String] },
  feature_labels: { type: [String] },

  // The samples broken out by data set. No futher internal structure
  sample_data_sets: {
    type: [
      new SimpleSchema({
        data_set_id: { type: String },
        data_set_name: { type: String },

        sample_labels: { type: [String] },
        sample_count: {
          type: Number,
          min: 0,
          autoValue: function () {
            return this.siblingField("sample_labels").value.length;
          },
        },
      })
    ],
    min: 1
  },

  // the various data sets/sample groups that were filtered to get this
  // sample group, complete with filter information
  sample_filtered_sources: {
    type: [
      new SimpleSchema({
        collection_name: {
          type: String,
          allowedValues: [
            "DataSets",
            "SampleGroups",
          ],
        },
        mongo_id: { type: String },

        name: { type: String },
        version: {
          type: Number,
          min: 0,
          custom: function () {
            // only required if it's from a sample group
            if (this.siblingField("collection_name").value === "SampleGroups") {
              if (!this.value) {
                return "required";
              }
            } else {
              if (this.value) {
                return "notAllowed";
              }
            }
          },
        },

        sample_labels: { type: [String] },
        sample_count: {
          type: Number,
          min: 0,
          autoValue: function () {
            return this.siblingField("sample_labels").value.length;
          },
        },

        // pre-filtering
        unfiltered_sample_count: {
          type: Number,
          autoValue: function () {
            var collection_name = this.siblingField("collection_name").value;
            var mongo_id = this.siblingField("mongo_id").value;

            var collection = MedBook.collections[collection_name];
            return collection.findOne(mongo_id).sample_labels.length;
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
        },
      })
    ],
    min: 1
  },
}));
