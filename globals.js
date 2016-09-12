// https://github.com/aldeed/meteor-collection2#autovalue
dateCreatedAutoValue = function () {
  if (this.isInsert) {
    return new Date();
  } else if (this.isUpsert) {
    return { $setOnInsert: new Date() };
  } else {
    this.unset();  // Prevent user from supplying their own value
  }
};
dateModifiedAutoValue = function () {
  if (this.isSet) {
    return;
  }
  return new Date();
};

// https://github.com/aldeed/meteor-simple-schema#make-a-field-conditionally-required
// NOTE: to be called like so: requiredIfTrue.call(this, <boolean>)
requiredIfTrue = function (shouldBeRequired) {
  if (shouldBeRequired) {
    // inserts
    if (!this.operator) {
      if (!this.isSet || this.value === null || this.value === "") return "required";
    }

    // updates
    else if (this.isSet) {
      if (this.operator === "$set" && this.value === null || this.value === "") return "required";
      if (this.operator === "$unset") return "required";
      if (this.operator === "$rename") return "required";
    }
  }
};

MedBook.studyLabelRegex = /^([A-Z]|[a-z]|-|_|[0-9])+$/;
MedBook.sampleLabelRegex =
    /^([A-Z]|[a-z]|-|_|[0-9])+\/([A-Z]|[a-z]|-|_|[0-9])+$/;

SimpleSchema.messages({
  noDotsOrDollarSignsAtStart:
      "Field names cannot contain periods or begin with a dollar sign.",
  reservedFieldName: '"_id" and "associated_object" are reserved names ' +
      'by the system',
  fieldNamesMustBeUnique:
      "Field names must be unique",
});

// returns the schema object for fields that have associated records
recordFields = function (allowedValues) {
  return {
    type: [ new SimpleSchema({
      name: {
        type: String,
        label: "Field name",
        custom: function () {
          // make sure it's a valid mongo attribute name
          if (this.value.indexOf(".") !== -1 || this.value[0] === "$") {
            return "noDotsOrDollarSignsAtStart";
          }

          if (this.value === "associated_object" || this.value === "_id") {
            return "reservedFieldName";
          }
        },
      },
      value_type: {
        type: String,
        allowedValues: allowedValues,
      },

      optional: { type: Boolean, optional: true },
    }) ],
    minCount: 1,
    custom: function () {
      var uniqueNames = _.uniq(_.pluck(this.value, "name"));

      if (this.value.length !== uniqueNames.length) {
        return "fieldNamesMustBeUnique";
      }
    },
  };
}
