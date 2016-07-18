SimpleSchema.messages({
  allowedValuesOnlyForString:
      "You can only specify allowed values for string type fields",
  noDotsOrDollarSignsAtStart:
      "Field names cannot contain periods or begin with a dollar sign.",
  reservedFieldName: 'Field name is reserved by the system',
});

Forms = new Meteor.Collection("forms");
Forms.attachSchema(new SimpleSchema({
  // administrators: { type: [String] },
  collaborations: { type: [String] },

  name: { type: String, label: "Name of form" },

  // which field has the sample_label
  sample_label_field: { type: String },

  fields: {
    type: [ new SimpleSchema({
      name: {
        type: String,
        label: "Field name",
        custom: function () {
          // make sure it's a valid mongo attribute name
          if (this.value.indexOf(".") !== -1 || this.value[0] === "$") {
            return "noDotsOrDollarSignsAtStart";
          }

          if (this.value === "form_id") {
            return "reservedFieldName";
          }
        },
      },
      value_type: {
        type: String,
        allowedValues: [
          "String",
          "Number",
          "Date",
        ],
      },
    }) ],
    minCount: 1,
  },
}));
