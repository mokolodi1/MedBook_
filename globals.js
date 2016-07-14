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
