// NOTE: use MedBook.validateRecord to check if a record is valid before
// insertion.

// TODO: maybe use the collection-hooks package
// https://github.com/matb33/meteor-collection-hooks/blob/master/package.js

Records = new Meteor.Collection("records");

// NOTE: fetchedObject argument is optional
MedBook.validateRecord = function(record, fetchedObject) {
  check(record, Object);

  // make sure associated_object is defined
  var associated_object = record.associated_object;
  if (!associated_object) {
    throw new Meteor.Error("associated_object-required");
  }

  // make sure associated_object is valid
  var validCollectionNames = ["Forms", "GeneSets"];
  if (Object.keys(associated_object).length !== 2 ||
      validCollectionNames.indexOf(associated_object.collection_name) === -1 ||
      typeof associated_object.mongo_id !== "string") {
    throw new Meteor.Error("associated_object-invalid");
  }

  // grab the associated object if not provided
  if (!fetchedObject) {
    var collection = MedBook.collections[associated_object.collection_name];
    fetchedObject = collection.findOne(associated_object.mongo_id);

    if (!fetchedObject) throw new Meteor.Error("invalid-form");
  }

  // delete the associated_object field and check if the
  // record matches the schema
  delete record.associated_object;
  delete record._id;

  var schemaObj = MedBook.schemaFromFields(fetchedObject.fields);
  check(record, new SimpleSchema(schemaObj));
};

MedBook.schemaFromFields = function (fields) {
  var schema = {};

  _.each(fields, function (field) {
    var fieldDefinition;

    if (field.value_type === "String") {
      fieldDefinition = { type: String };
    } else if (field.value_type === "Number") {
      fieldDefinition = { type: Number, decimal: true };
    } else if (field.value_type === "Date") {
      fieldDefinition = { type: Date };
    } else {
      throw new Meteor.Error("Invalid field type");
    }

    // attach all other attributes (except field.value_type and .name)
    // This is so that it can handle things like minCount, etc.
    _.extend(fieldDefinition, _.omit(field, "name", "value_type"));

    schema[field.name] = fieldDefinition;
  });

  return schema;
};
