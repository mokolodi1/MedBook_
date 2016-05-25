SimpleSchema.messages({
  allowedValuesOnlyForString:
      "You can only specify allowed values for string type fields",
  noDotsOrDollarSignsAtStart:
      "Field names cannot contain periods or begin with a dollar sign.",
});

Forms = new Meteor.Collection("forms");
Forms.attachSchema(new SimpleSchema({
  collaborations: { type: [String] },

  name: { type: String, label: "Name of form" },
  specificity: { type: String, allowedValues: [ "patient", "sample" ] },

  fields: {
    type: [ new SimpleSchema({
      label: {
        type: String,
        label: "Field name",
        custom: function () {
          // make sure it's a valid mongo attribute name
          if (this.value.indexOf(".") !== -1 || this.value[0] === "$") {
            return "noDotsOrDollarSignsAtStart";
          }
        },
      },
      type: {
        type: String,
        allowedValues: [
          "String",
          "Select",
          "Integer",
          "Decimal",
          "Boolean",
          "Date",
        ],
      },
      allowedValues: {
        type: [String],
        optional: true,
        custom: function () {
          if (this.value && this.siblingField("type").value !== "Select") {
            return "allowedValuesOnlyForString";
          }
        },
        minCount: 1,
      },
      min: { type: Number, decimal: true, optional: true },
      max: { type: Number, decimal: true, optional: true },

      optional: { type: Boolean, optional: true },
    }) ],
    minCount: 1,
  },
}));
