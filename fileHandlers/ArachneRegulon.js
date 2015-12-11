// TODO: change this to accept options instead of wrangler_file_id
function ArachneRegulon (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  // TODO: remove this
  this.setSubmissionType.call(this, 'network');
}

ArachneRegulon.prototype = Object.create(TabSeperatedFile.prototype);
ArachneRegulon.prototype.constructor = ArachneRegulon;

ArachneRegulon.prototype.parseLine = function (brokenTabs, lineNumber, line) {
  if (lineNumber % 10 === 0) {
    console.log("lineNumber:", lineNumber);
  }

  if (brokenTabs.length % 2 !== 1) {
    throw "Line " + lineNumber + " does not have odd number of columns";
  }

  if (lineNumber === 1) {
    // Networks.findOne({
    //
    // })
    this.networkName = "hello";
    this.networkVersion = 1;

    // TODO: default name to filename

    if (this.wranglerPeek) {
      this.insertWranglerDocument.call(this, {
        document_type: "new_network",
        contents: {
          name: this.networkName,
          version: this.networkVersion,
          file_name: this.blob.original.name,
        },
      });
    } else {
      this.network_id = Networks.insert({
        name: this.networkName,
        version: this.networkVersion,
        collaborations: [this.submission.options.collaboration_label],
        type: "arachne_regulon"
      });
    }
  }

  var source_label = brokenTabs[0];
  if (!source_label) {
    throw "Line " + lineNumber + " is blank";
  }

  var allWeights = [];

  for (var column = 1; column < brokenTabs.length; column += 2) {
    var target_label = brokenTabs[column];
    var weightString = brokenTabs[column + 1];

    validateNumberStrings([weightString]);
    var parsedWeight = parseFloat(weightString);

    if (this.wranglerPeek) {
      allWeights.push(parsedWeight);
    } else {
      var ne = {
        network_id: this.network_id,
        label: source_label,
        type: "gene"
      };
      NetworkElements.upsert(ne, {$set:ne});
      NetworkInteractions.insert({
        network_id: this.network_id,
        source_label: source_label,
        target_label: target_label,
        interaction_type: "-t>",
        interaction_weight: parsedWeight,
      });
    }
  }

  // TODO: add in gene label checking/mapping

  if (this.wranglerPeek) {
    if (allWeights.length === 0) {
      throw "No interactions specified for source gene " + source_label;
    }
    var mean_weight = _.reduce(allWeights, function(memo, num) {
      return memo + num;
    }, 0) / allWeights.length;

    this.insertWranglerDocument({
      document_type: "source_level_interactions",
      contents: {
        source_label: source_label,
        target_count: allWeights.length,
        max_weight: _.max(allWeights),
        min_weight: _.min(allWeights),
        mean_weight: mean_weight,
        network_name: this.networkName,
        network_version: this.networkVersion,
      },
    });
  } else {
    var ne = {
      network_id: this.network_id,
      label: source_label,
      type: "gene",
    };
    NetworkElements.upsert(ne, {$set:ne});
  }
};

WranglerFileTypes.ArachneRegulon = ArachneRegulon;
