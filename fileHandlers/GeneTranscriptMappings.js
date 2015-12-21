// TODO: specify options instead of a blob_id
function GeneTranscriptMappings (blob_id) {
  console.log("blob_id:", blob_id);
  TabSeperatedFile.call(this, {
    blob_id: blob_id
  });
  console.log("lksjdfjlksdf");
}

GeneTranscriptMappings.prototype = Object.create(TabSeperatedFile.prototype);
GeneTranscriptMappings.prototype.constructor = GeneTranscriptMappings;

GeneTranscriptMappings.prototype.parseLine = function (brokenTabs, lineNumber, line) {
  if (lineNumber % 1000 === 0) {
    console.log("lineNumber:", lineNumber);
  }

  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  if (lineNumber === 1) { // header line
    this.transcriptLabelIndex = brokenTabs.indexOf("Transcript ID");
    if (this.transcriptLabelIndex === -1) {
      throw 'Could not find header column "Transcript ID"';
    }

    this.geneLabelIndex = brokenTabs.indexOf("Gene name");
    if (this.geneLabelIndex === -1) {
      throw 'Could not find header column "Gene name"';
    }

    this.transcriptsMapped = 0;
    this.unableToMap = 0;
  } else {
    var label = brokenTabs[this.geneLabelIndex];
    var labelAndVersion = brokenTabs[this.transcriptLabelIndex].split(".");
    var newTranscript = {
      label: labelAndVersion[0],
      version: parseInt(labelAndVersion[1], 10),
    };
    var modifier = {
      $addToSet: {
        transcripts: newTranscript
      }
    };

    // try gene_label then synonym_labels then previous_labels
    var query = { gene_label: label };
    var updatedCount = Genes.update(query, modifier);

    if (updatedCount === 0) {
      query = { synonym_labels: label };
      updatedCount = Genes.update(query, modifier);
    }

    if (updatedCount === 0) {
      query = { previous_labels: label };
      updatedCount = Genes.update(query, modifier);
    }

    // update the summary variables
    if (updatedCount > 0) {
      this.transcriptsMapped++;
    } else {
      this.unableToMap++;
    }
  }
};

GeneTranscriptMappings.prototype.endOfFile = function () {
  return {
    transcriptsMapped: this.transcriptsMapped,
    unableToMap: this.unableToMap,
  };
};

WranglerFileTypes.GeneTranscriptMappings = GeneTranscriptMappings;

Moko.ensureIndex(Genes, {
  gene_label: 1
});

Moko.ensureIndex(Genes, {
  previous_labels: 1
});

Moko.ensureIndex(Genes, {
  synonym_labels: 1
});
