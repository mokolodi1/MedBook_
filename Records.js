SimpleSchema.messages({
  recordValuesDontMatchFormSchema:
      "Record values do not match the form schema.",
  cantSpecifySample:
      "You cannot specify a sample label for a patient-specific form",
});

Records = new Meteor.Collection("records");
Records.attachSchema(new SimpleSchema({
  collaborations: { type: [String] },

  // foreign key to forms collection
  form_id: {
    type: String,
    label: "Form",
  },

  // foreign key to data_sets collection
  data_set_id: {
    type: String,
    label: "Data set",
  },

  patient_label: {
    type: String,
    optional: true,
    custom: function () {
      var form = Forms.findOne(this.field("form_id").value, {
        fields: { specificity: 1 }
      });

      return requiredIfTrue.call(this, form.specificity === "patient");
    },
    label: "Patient",
  },
  sample_label: {
    type: String,
    optional: true,
    custom: function () {
      var form = Forms.findOne(this.field("form_id").value, {
        fields: { specificity: 1 }
      });

      if (form.specificity === "patient") {
        if (this.isSet) {
          return "cantSpecifySample";
        }
      } else { // NOTE: only two possible values, so specificity = "sample"
        return requiredIfTrue.call(this, true);
      }
    },
    label: "Sample",
  },

  values: {
    type: Object,
    blackbox: true,
    custom: function () {
      var form = Forms.findOne(this.field("form_id").value);

      var isValid = new SimpleSchema(MedBook.schemaObjectFromForm(form))
          .newContext()
          .validate(this.value);

      if (!isValid) {
        return "recordValuesDontMatchFormSchema";
      }
    },
  }
}));

MedBook.schemaObjectFromForm = function (form) {
  var schema = {};

  _.each(form.fields, function (field) {
    var fieldDefinition;

    if (field.type === "String" || field.type === "Select") {
      fieldDefinition = { type: String };
    } else if (field.type === "Boolean") {
      fieldDefinition = { type: Boolean };
    } else if (field.type === "Integer") {
      fieldDefinition = { type: Number };
    } else if (field.type === "Decimal") {
      fieldDefinition = { type: Number, decimal: true };
    } else if (field.type === "Date") {
      fieldDefinition = { type: Date };
    } else {
      throw new Meteor.Error("Invalid field type");
    }

    // attach all other attributes (except field.type)
    delete field.type;
    _.extend(fieldDefinition, field);

    schema[field.label] = fieldDefinition;
  });

  return schema;
};
