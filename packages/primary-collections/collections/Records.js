// NOTE: use MedBook.validateRecord to check if a record is valid before
// insertion.

// TODO: maybe use the collection-hooks package
// https://github.com/matb33/meteor-collection-hooks/blob/master/package.js

Records = new Meteor.Collection("records");

// options:
// - { bare: true } will validate the record without checking (or removing)
//   associated_object or _id
MedBook.validateRecord = function(record, fields, options) {
  check(record, Object);

  if (!options || !options.bare) {
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
    if (!fields) {
      var collection = MedBook.collections[associated_object.collection_name];
      var fetchedObject = collection.findOne(associated_object.mongo_id);

      if (!fetchedObject || !fetchedObject.fields) {
        throw new Meteor.Error("invalid-fields-object");
      }

      fields = fetchedObject.fields;
    }
  }

  // omit the associated_object and _id before validating
  var record = _.omit(record, "associated_object", "_id");

  // check if record matches the schema
  var schemaObj = MedBook.schemaFromFields(fields);
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
