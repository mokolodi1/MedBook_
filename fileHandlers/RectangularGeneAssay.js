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

    // Figure out the sample labels
    // Throw an error if it already exists or is not defined in
    // the selected study.
    var study = Studies.findOne(this.wranglerFile.options.study_id);
    var dataSet = DataSets.findOne(this.wranglerFile.options.data_set_id);

    this.sampleLabels = [];
    for (var column = 1; column < brokenTabs.length; column++) {
      var sample_label = study.study_label + "/" + brokenTabs[column];

      console.log("study.sample_labels:", study.sample_labels);
      console.log("sample_label:", sample_label);
      if (study.sample_labels.indexOf(sample_label) === -1) {
        throw "Sample " + sample_label + " not defined in study.";
      }

      console.log("dataSet.sample_labels:", dataSet.sample_labels);
      if (dataSet.sample_labels.indexOf(sample_label) !== -1) {
        throw "Sample " + sample_label + " already defined in data set.";
      }

      this.sampleLabels.push(sample_label);
    }
    console.log("this.sampleLabels:", this.sampleLabels);

    if (this.wranglerPeek) {
      this.line_count = 0;
    }

    // keep track of the genes we've seen
    this.geneLabelIndex = {};

    this.beforeParsing.call(this);
  } else { // rest of file
    var expressionStrings = brokenTabs.slice(1);
    validateNumberStrings(expressionStrings);

    var gene_label = brokenTabs[0];

    if (this.wranglerPeek) {
      this.line_count++;
    } else {
      this.insertToCollection.call(this, gene_label, expressionStrings);
    }

    // add one to the gene label index
    if (!this.geneLabelIndex[gene_label]) {
      this.geneLabelIndex[gene_label] = 0;
    }
    this.geneLabelIndex[gene_label]++;
  }
};

// set up non-required functions to be _.noops
RectangularGeneAssay.prototype.beforeParsing = function () {};
RectangularGeneAssay.prototype.endOfFile = function () {};
