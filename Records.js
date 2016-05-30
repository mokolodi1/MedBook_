SimpleSchema.messages({
  recordValuesDontMatchFormSchema:
      "Record values do not match the form schema.",
  invalidSpecifier:
      "Invalid specifier",
});

function requiredIfPatientSpecificity() {
  var form = Forms.findOne(this.field("form_id").value, {
    fields: { specificity: 1 }
  });

  return requiredIfTrue.call(this, form.specificity === "patient");
}

function requiredIfSampleSpecificity() {
  var form = Forms.findOne(this.field("form_id").value, {
    fields: { specificity: 1 }
  });

  if (form.specificity === "patient") {
    if (this.isSet) {
      return "cantSpecifySample";
    }
  } else {
    // NOTE: only two possible values, so here specificity = "sample"
    return requiredIfTrue.call(this, true);
  }
}

var patientSpecificityContext = new SimpleSchema({
  patient_id: { type: String },
  patient_label: { type: String },
}).newContext();

var sampleSpecificityContext = new SimpleSchema({
  patient_id: { type: String, optional: true },
  patient_label: { type: String, optional: true },
  data_set_id: { type: String },
  sample_label: { type: String },
}).newContext();

Records = new Meteor.Collection("records");
Records.attachSchema(new SimpleSchema({
  // foreign key to forms collection
  form_id: {
    type: String,
    label: "Form",
  },

  specifier: {
    type: new SimpleSchema({
      patient_id: { type: String, optional: true },
      patient_label: { type: String, label: "Patient", optional: true },
      data_set_id: { type: String, label: "Data set", optional: true },
      sample_label: { type: String, label: "Sample", optional: true },
    }),
    custom: function() {
      var form = Forms.findOne(this.field("form_id").value, {
        fields: { specificity: 1 }
      });

      var isInvalid = true;
      if (form.specificity === "patient") {
        isInvalid = patientSpecificityContext.validate(this.value);
      } else {
        isInvalid = sampleSpecificityContext.validate(this.value);
      }

      if (!isValid) {
        return "invalidSpecifier";
      }
    },
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
