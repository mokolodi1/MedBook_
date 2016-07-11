MedBook.utility = {};

MedBook.utility.sampleObjToStr = function (sampleObj) {
  return sampleObj.study_label + "/" + sampleObj.sample_label;
};

MedBook.utility.sampleStrToObj = function (sampleStr) {
  var slashIndex = sampleStr.indexOf("/");

  return {
    study_label: sampleStr.slice(0, slashIndex),
    sample_label: sampleStr.slice(slashIndex + 1)
  };
};

MedBook.utility.sampleArrObjToStr = function (array) {
  return _.map(array, MedBook.utility.sampleObjToStr);
};

MedBook.utility.sampleArrStrToObj = function (array) {
  return _.map(array, MedBook.utility.sampleStrToObj);
};
