// NOTE: use MedBook.validateRecord to check if a record is valid before
// insertion.

// TODO: maybe use the collection-hooks package
// https://github.com/matb33/meteor-collection-hooks/blob/master/package.js

Records = new Meteor.Collection("records");

// NOTE: form argument is optional
MedBook.validateRecord = function(record, form) {
  check(record, Object);
  check(form, Match.Optional(Forms.simpleSchema()));

  // make sure form_id is defined
  var form_id = record.form_id;
  if (!form_id) throw new Meteor.Error("form_id-required");

  // grab the form if not passed
  if (!form) {
    form = Forms.findOne(record.form_id);

    if (!form) throw new Meteor.Error("invalid-form");
  }

  // delete the form_id field and check if the record matches the schema
  var recordCopy = JSON.parse(JSON.stringify(record));
  delete recordCopy.form_id;

  check(recordCopy, schemaObjectFromForm(form));
};

MedBook.schemaObjectFromForm = function (form) {
  var schema = {};

  _.each(form.fields, function (field) {
    var fieldDefinition;

    if (field.value_type === "String" || field.value_type === "Select") {
      fieldDefinition = { type: String };
    } else if (field.value_type === "Boolean") {
      fieldDefinition = { type: Boolean };
    } else if (field.value_type === "Integer") {
      fieldDefinition = { type: Number };
    } else if (field.value_type === "Decimal") {
      fieldDefinition = { type: Number, decimal: true };
    } else if (field.value_type === "Date") {
      fieldDefinition = { type: Date };
    } else {
      throw new Meteor.Error("Invalid field type");
    }

    // attach all other attributes (except field.value_type)
    delete field.value_type;
    _.extend(fieldDefinition, field);

    schema[field.name] = fieldDefinition;
  });

  return schema;
};
