// See here:
// http://www.broadinstitute.org/cancer/software/genepattern/file-formats-guide#GMT

// TODO: change this to accept options instead of wrangler_file_id
function GeneSetCollection (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  // TODO: remove this (?)
  this.setSubmissionType.call(this, "gene_set_collection");
}

GeneSetCollection.prototype = Object.create(TabSeperatedFile.prototype);
GeneSetCollection.prototype.constructor = GeneSetCollection;

GeneSetCollection.prototype.parseLine =
    function (brokenTabs, lineNumber, line) {
  // make sure it's at least three wide
  if (brokenTabs.length < 3) {
    throw "Line " + lineNumber + " less than three columns";
  }

  // initialize stuff, insert to GeneSetCollections if not wranglerPeek
  if (lineNumber === 1) {
    if (this.wranglerPeek) {
      this.gene_set_count = 0;
    } else {
      var user = Meteor.users.findOne(this.wranglerFile.user_id);

      this.gene_set_collection_id = GeneSetCollections.insert({
        name: this.wranglerFile.options.name,
        description: this.wranglerFile.options.description,
        collaborations: [ user.collaborations.personal ],
      });
    }
  }

  // deal with data in the line
  if (this.wranglerPeek) {
    this.gene_set_count++;
  } else {
    GeneSets.insert({
      name: brokenTabs[0],
      description: brokenTabs[1],
      gene_labels: brokenTabs.slice(2),
      gene_set_collection_id: this.gene_set_collection_id,
    });
  }
};

GeneSetCollection.prototype.endOfFile = function () {
  if (this.wranglerPeek) {
    this.insertWranglerDocument.call(this, {
      document_type: "new_gene_set_collection",
      contents: {
        name: this.wranglerFile.options.name,
        description: this.wranglerFile.options.description,
        gene_set_count: this.gene_set_count,
      }
    });
    console.log("inserted");
  }
};

WranglerFileTypes.GeneSetCollection = GeneSetCollection;
