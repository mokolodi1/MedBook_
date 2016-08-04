MedBook.utility = {};

MedBook.utility.sampleObjToStr = function (sampleObj) {
  return sampleObj.study_label + "/" + sampleObj.uq_sample_label;
};

MedBook.utility.sampleStrToObj = function (sampleStr) {
  var slashIndex = sampleStr.indexOf("/");

  return {
    study_label: sampleStr.slice(0, slashIndex),
    uq_sample_label: sampleStr.slice(slashIndex + 1)
  };
};

MedBook.utility.sampleArrObjToStr = function (array) {
  return _.map(array, MedBook.utility.sampleObjToStr);
};

MedBook.utility.sampleArrStrToObj = function (array) {
  return _.map(array, MedBook.utility.sampleStrToObj);
};

MedBook.utility.unqualifySampleLabels = function (sampleLabels) {
  var sampleObjects = MedBook.utility.sampleArrStrToObj(sampleLabels);

  return _.pluck(sampleObjects, "uq_sample_label");
};

var slugStringMap = {
  gene_expression: "gene expression",
  rsem: "RSEM",
  quan_norm_counts: "quantile normalized counts",
  fpkm: "FPKM",
  tpm: "TPM",
  raw_counts: "raw counts",
  rsem: "RSEM",
  cufflinks: "Cufflinks",
  // gistic: "GISTIC",
  // adtex: "Adtex",
  // varscan: "Varscan",
};
MedBook.utility.slugToString = function (slug) {
  var mapped = slugStringMap[slug];

  if (!mapped) return slug;

  return mapped;
};
