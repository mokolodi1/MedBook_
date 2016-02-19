// TODO: change this to accept options instead of wrangler_file_id
RectangularGeneAssay = function (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  // loadGeneMapping.call(this);
};

RectangularGeneAssay.prototype =
    Object.create(TabSeperatedFile.prototype);
RectangularGeneAssay.prototype.constructor = RectangularGeneAssay;

// function loadGeneMapping () {
//   var self = this;
//
//   this.geneMapping = {}; // for use in validateGeneLabel
//   function addGeneMapping (attribute, newValue) {
//     if (self.geneMapping[attribute]) {
//       // NOTE: should never be run (see condition in addMappingsInArray)
//       console.log("geneMapping[" + attribute + "] overridden from " +
//           self.geneMapping[attribute] + " to " + newValue);
//     }
//
//     // prefer mapping gene ==> gene (rather than synonym ==> gene)
//     // see order of loading below
//     if (self.geneMapping[attribute] !== attribute) {
//       self.geneMapping[attribute] = newValue;
//     }
//   }
//
//   console.log("loading valid genes");
//
//   // this.geneMapping["asdf"] = "asdf"
//   Genes.find({}).forEach(function (doc) {
//     addGeneMapping(doc.gene_label, doc.gene_label);
//   });
//
//   function addMappingsInArray(arrayAttribute, doc) {
//     for (var index in doc[arrayAttribute]) {
//       var value = doc[arrayAttribute][index];
//       if (!self.geneMapping[value]) {
//         addGeneMapping(value, doc.gene_label);
//       }
//     }
//   }
//
//   // map synonym_labels to respective gene_labels, then previous_labels
//   Genes.find({}).forEach(_.partial(addMappingsInArray, "synonym_labels"));
//   Genes.find({}).forEach(_.partial(addMappingsInArray, "previous_labels"));
//
//   console.log("done loading valid genes");
// }

// // map a gene label into HUGO namespace
// function mapGeneLabel (originalGeneLabel) {
//   var mappedGeneLabel = this.geneMapping[originalGeneLabel];
//
//   // make sure the user knows we're ignoring/mapping the gene if applicable
//   if (!mappedGeneLabel) {
//     if (this.wranglerPeek) {
//       this.insertWranglerDocument.call(this, {
//         document_type: "ignored_genes",
//         contents: {
//           gene: originalGeneLabel
//         }
//       });
//     }
//     return; // ignore the gene
//   } else if (mappedGeneLabel !== originalGeneLabel) {
//     if (this.wranglerPeek) {
//       this.insertWranglerDocument.call(this, {
//         document_type: "mapped_genes",
//         contents: {
//           gene_in_file: originalGeneLabel,
//           mapped_gene: mappedGeneLabel
//         }
//       });
//     }
//   }
//
//   return mappedGeneLabel;
// }

RectangularGeneAssay.prototype.updateOldStuff = function () {
  // no old stuff to do :)
};

RectangularGeneAssay.prototype.parseLine =
    function (brokenTabs, lineNumber, line) {
  if (lineNumber % 1000 === 0) {
    console.log("lineNumber:", lineNumber);
  }

  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  if (lineNumber === 1) { // header line
    if (brokenTabs.length < 2) {
      throw "Expected 2+ column tab file, got " + brokenTabs.length +
          " column tab file";
    }

    setSampleLabels.call(this, brokenTabs); // wrangle sample labels
    console.log("this.sampleLabels:", this.sampleLabels);

    // TODO: run all the time when we get the study_label before the peek
    if (!this.wranglerPeek) {
      for (var sampleIndex in this.sampleLabels) {
        var sampleLabel = this.sampleLabels[sampleIndex];
        ensureClinicalExists.call(this, this.submission.options.study_label, sampleLabel);
      }
    }

    if (this.wranglerPeek) {
      this.line_count = 0;
      this.alertIfSampleDataExists.call(this);
    }
  } else { // rest of file
    var expressionStrings = brokenTabs.slice(1);
    validateNumberStrings(expressionStrings);

    this.updateOldStuff.call(this, brokenTabs, expressionStrings);

    // map the gene based on synonymes and previouses
    unmappedGeneLabel = brokenTabs[0];
    // http://regexr.com/3chqf
    var chromosomeSuffix = unmappedGeneLabel.match(/\w+?(?=\|chr[0-9]{1,2})/);
    if (chromosomeSuffix) {
      unmappedGeneLabel = chromosomeSuffix[0];
    }
    // var gene_label = mapGeneLabel.call(this, unmappedGeneLabel);
    // if (!gene_label) { // ignore the gene if it doesn't map
    //   return;
    // }

    if (this.wranglerPeek) {
      this.line_count++;
    } else {
      return this.insertToCollection.call(this, gene_label, expressionStrings);
    }
  }
};
