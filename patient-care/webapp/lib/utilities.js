MedBook.regexFieldsQuery = function (searchFields, searchText) {
  if (!searchText) {
    return {};
  }

  let searchRegex = new RegExp(searchText, "i");

  // NOTE: this will only work for text fields.
  // TODO: maybe include boolean/numerical fields
  // if we store the job schemas somewhere
  return {
    "$or": _.map(searchFields, (field) => {
      return { [field]: searchRegex };
    }),
  };
};
