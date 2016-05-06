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

    setSampleLabels.call(this, brokenTabs); // wrangle sample labels
    console.log("this.sampleLabels:", this.sampleLabels);

    // TODO: run all the time when we get the study_label before the peek
    for (var sampleIndex in this.sampleLabels) {
      var sampleLabel = this.sampleLabels[sampleIndex];
      ensureSampleExists.call(this, this.wranglerFile.options.study_label, sampleLabel);
    }

    if (this.wranglerPeek) {
      this.line_count = 0;
    }

    this.alertIfSampleDataExists.call(this);

    // keep track of the genes we've seen
    this.geneLabelIndex = {};

    this.beforeParsing.call(this);
  } else { // rest of file
    var expressionStrings = brokenTabs.slice(1);
    validateNumberStrings(expressionStrings);

    this.updateOldStuff.call(this, brokenTabs, expressionStrings);

    // map the gene based on synonymes and previouses
    var gene_label = brokenTabs[0];
    // remove stuff after "|" ("MYC|ch3")  http://regexr.com/3chqf
    var chromosomeSuffix = gene_label.match(/\w+?(?=\|chr[0-9]{1,2})/);
    if (chromosomeSuffix) {
      gene_label = chromosomeSuffix[0];
    }

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
RectangularGeneAssay.prototype.updateOldStuff = function () {};
