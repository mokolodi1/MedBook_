// studies migration script:
/*
db.getCollection('data_sets').update({}, {
  $unset: {short_name: 1, tables: 1, Patient_IDs: 1, id: 1},
  $rename: {Sample_IDs: "sample_labels"}
}, {multi: true})
*/

DataSets = new Meteor.Collection("data_sets");
DataSets.attachSchema(new SimpleSchema({
  collaborations: { type: [String] },

  name: { type: String },
  description: { type: String, optional: true },

  // store seperately because some samples don't have patients
  sample_labels: { type: [String] },
  patients: {
    type: [ new SimpleSchema({
      patient_label: { type: String },
      sample_labels: { type: [String], optional: true, defaultValue: [] },
    }) ],
    optional: true, // sometimes there are no patients
  },

  // TODO: switch out
  gene_expression: { type: [String], optional: true },
  gene_expression_index: { type: Object, blackbox: true, optional: true },
  gene_expression_genes: { type: [String], optional: true },
  gene_expression_wrangling: {
    type: Boolean,
    defaultValue: false,
    optional: true
  },
  // gene_expression: {
  //   type: new SimpleSchema({
  //     rsem_quan_log2: { type: [String] },
  //     rsem_quan_log2_index: { type: Object, blackbox: true, optional: true },
  //
  //     // all samples
  //     valid_genes: { type: [String], optional: true },
  //
  //     // whether someone is currently inserting data (soft lock)
  //     currently_wrangling: { type: Boolean, defaultValue: false },
  //   }),
  // },
}));


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

SimpleSchema.messages({
  recordValuesDontMatchFormSchema:
      "Record values do not match the form schema.",
  cantSpecifySample:
      "You cannot specify a sample label for a patient-specific form",
  allowedValuesOnlyForString:
      "You can only specify allowed values for string type fields",
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
