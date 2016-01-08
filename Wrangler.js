Wrangler = {};

Wrangler.wrangleSampleLabel = function (text) {
  if (!text) {
    throw new Error("called wrangleSampleLabel with undefined");
  }

  // TODO: what if it's ProR3 or something?
  var proIfPro = "";
  if (text.match(/pro/gi)) {
    proIfPro = "Pro";
  }

  var matches;
  var firstMatch;
  var replicateNumber = "";

  // try to match something like "DTB-000"
  matches = text.match(/DTB-[0-9][0-9][0-9]/g);
  if (matches) {
    if (text.match(/duplicate/gi)) {
      if (proIfPro === "") {
        replicateNumber = "Dup";
      } else {
        replicateNumber = "2";
      }
    }

    var baselineProWithNum = text.match(/(baseline|progression)[0-9]/gi);
    if (baselineProWithNum) {
      replicateNumber = baselineProWithNum[0].match(/[0-9]/)[0];
      if (proIfPro === "") {
        if (replicateNumber === "2") {
          replicateNumber = "Dup";
        } else {
          throw "Unclear what to do with third BL duplicate for " + text;
        }
      }
    }

    return matches[0] + proIfPro + replicateNumber;
  }

  // match weird .vcf file names (e.g. "DTB-OH-014-Pro-AC.anno.fix.vcf")
  // http://regexr.com/3c0kn
  matches = text.match(/DTB-[A-Z]{1,4}-[0-9]{3}/g);
  if (matches) {
    return matches[0] + proIfPro;
  }

  // match TCGA sample labels (e.g. "TCGA-02-0055-01A-01R-1849-01")
  // https://wiki.nci.nih.gov/display/TCGA/TCGA+barcode
  // http://regexr.com/3c1b7
  // whole barcode: /TCGA-[A-Z0-9]{2}-[A-Z0-9]{1,4}-[0-9]{2}[A-Z]-[0-9]{2}[DGHRTWX]-[A-Z0-9]{4}-[0-9]{2}/g;
  //
  // NOTE: I removed the vial letter from this because if someone reads the
  // docs, having the vial letter is not necessary. This is not consistant
  // with what is currently loaded in expression2. When we move to
  // gene_expression this problem will be gone :)
  matches = text.match(/TCGA-[A-Z0-9]{2}-[A-Z0-9]{1,4}-[0-9]{2}/g);
  if (matches) {
    return matches[0];
  }

  // match samples like "DTB_097_Pro_T" (copy number data)
  // http://regexr.com/3c5p8
  // DTB_097_BL_T ==> DTB-097
  // DTB_097_BL2_T ==> DTB-097Dup
  // DTB_097_BL3_T ==> error thrown!
  // DTB_097_Pro_T ==> DTB-097Pro
  // DTB_097_Pro5_T ==> DTB-097Pro5
  matches = text.match(/DTB_[0-9]{3}_(BL|Pro)([0-9]|)_T/g);
  if (matches) {
    firstMatch = matches[0];
    var numbers = firstMatch.match(/[0-9]{3}/g)[0];

    replicateNumber = "";
    // NOTE: no | after [0-9]
    var replicateMatches = firstMatch.match(/(BL|Pro)([0-9])/g);
    if (replicateMatches) {
      var replicatePart = replicateMatches[0];
      if (proIfPro === "") {
        if (replicatePart === "BL2") {
          replicateNumber = "Dup";
        } else {
          throw "Unclear what to do with third BL duplicate for " + text;
        }
      } else {
        replicateNumber = replicatePart.match(/[0-9]/g)[0];
      }
    }

    return "DTB-" + numbers + proIfPro + replicateNumber;
  }

  // http://regexr.com/3cd38
  // ex. "RNA150410JA_10_1-1-15_M12_EV_05uM_JQ1"
  var ohsu = text.match(
    /RNA[0-9]{6}JA_[0-9]{1,2}_([0-9]{1,2}-){2}[0-9]{1,2}_([A-Za-z0-9-]+_?){3,5}/g
  );
  if (ohsu) {
    return ohsu[0];
  }

  // http://regexr.com/3cfg4
  var olena = text.match(/POG[0-9]{3}(_|-)[A-Z0-9]{2,4}/g);
  if (olena) {
    return olena[0];
  }

  // http://regexr.com/3cfi0
  var target = text.match(/TARGET-[0-9]{2}-[A-Z]{6}-[0-9]{2}/g);
  if (target) {
    return target[0];
  }
};

Wrangler.wranglePatientLabel = function (text) {
  // NOTE: this is the only place with study-specific code
  var matches;

  // WCDT
  matches = text.match(/DTB-[0-9]{3}/);
  if (matches) {
    return matches[0];
  }

  // TCGA
  matches = text.match(/TCGA-[A-Z0-9]{2}-[A-Z0-9]{1,4}/g);
  if (matches) {
    return matches[0];
  }

  // http://regexr.com/3cfg4 (sample label link)
  var olena = text.match(/POG[0-9]{3}/g);
  if (olena) {
    return olena[0];
  }

  // see matching sample label regex for examples
  var target = text.match(/TARGET-[0-9]{2}-[A-Z]{6}/g);
  if (target) {
    return target[0];
  }

  // NOTE: default for now is to return the text with which the function was
  // called. This function is usually called with the sample label.
  return text;
};

// for expression collection schemas
function makeExpressionSchema (collection) {
  var schema = collection.simpleSchema().schema();
  var normalizationKeys = _.filter(Object.keys(schema),
      function (value) {
    // check if it has 'values.' at the beginning
    return value.slice(0, 7) === 'values.' &&
        value !== "values.quantile_counts_log";
  });
  var allowedValues = _.map(normalizationKeys, function (value) {
    // 'values.raw_counts' ==> 'raw_counts'
    return value.slice(7);
  });
  var options = _.map(allowedValues, function (normalization) {
    return {
      value: normalization,
      label: schema['values.' + normalization].label,
    };
  });
  // use a doc so that it doesn't have a clone to the same object (I don't think)
  return new SimpleSchema({
    normalization: {
      type: String,
      allowedValues: allowedValues,
      autoform: {
        options: options,
      },
    }
  });
}

function makeAnnotationSchema (collection, allowedValues) {
  var schema = collection.simpleSchema().schema();
  var options = _.map(allowedValues, function (type) {
    return {
      value: type,
      label: schema[type].label,
    };
  });
  return new SimpleSchema({
    annotation_type: {
      type: String,
      allowedValues: allowedValues,
      autoform: {
        options: options,
      },
    }
  });
}

Wrangler.fileTypes = {
  RectangularGeneExpression: {
    description: "Gene expression rectangular matrix",
    schema: makeExpressionSchema(GeneExpression),
  },
  RectangularIsoformExpression: {
    description: "Isoform expression rectangular matrix",
    schema: makeExpressionSchema(IsoformExpression),
  },
  BD2KSampleLabelMap: {
    description: "Sample label mapping (BD2K pipeline)",
  },
  ContrastMatrix: {
    description: "Contrast matrix",
    schema: new SimpleSchema({
      collaboration_label: { type: String },
      update_or_create: {
        type: String,
        allowedValues: [
          "update",
          "create",
        ],
        label: "Update or create",
      },
      contrast_label: { type: String, label: "Contrast name" },
      description: {
        type: String,
        optional: true,
        custom: function () {
          if (this.field("update_or_create").value === "create") {
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
        }
      },
    }),
  },
  "RectangularGeneAnnotation": {
    description: "Gene annotation rectangular matrix",
    schema: makeAnnotationSchema(GeneAnnotation, [
      "gistic_copy_number"
    ]),
  },
  // // NOTE: people can still run it, but the client picklist won't show it
  // ArachneRegulon: {
  //   description: "Arachne generated adjacancy matrix weighted by mutual information",
  //   schema: new SimpleSchema({
  //     network_name: {
  //       type: String, // TODO: add some kind of autocomplete
  //     },
  //   }),
  // }
};
