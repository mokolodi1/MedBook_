// See here:
// http://www.broadinstitute.org/cancer/software/genepattern/file-formats-guide#GMT

// TODO: change this to accept options instead of wrangler_file_id
function GeneSetGroup (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  // TODO: remove this (?)
  this.setSubmissionType.call(this, "gene_set_collection");
}

GeneSetGroup.prototype = Object.create(TabSeperatedFile.prototype);
GeneSetGroup.prototype.constructor = GeneSetGroup;

GeneSetGroup.prototype.parseLine =
    function (brokenTabs, lineNumber, line) {
  // make sure it's at least three wide
  if (brokenTabs.length < 3) {
    throw "Line " + lineNumber + " less than three columns";
  }

  // initialize stuff, insert to GeneSetGroups if not wranglerPeek
  if (lineNumber === 1) {
    if (this.wranglerPeek) {
      this.gene_set_count = 0;
    } else {
      this.gene_set_group_id = GeneSetGroups.insert({
        name: this.wranglerFile.options.name,
        description: this.wranglerFile.options.description,
        collaborations: [],
        gene_set_names: [],
        gene_set_count: 0,
      });

      this.gene_set_names = [];

      this.geneSetsBulk = GeneSets.rawCollection().initializeUnorderedBulkOp();
    }
  }

  // deal with data in the line
  if (this.wranglerPeek) {
    this.gene_set_count++;
  } else {
    var name = brokenTabs[0];

    this.geneSetsBulk.insert({
      name: name,
      description: brokenTabs[1],
      gene_labels: brokenTabs.slice(2),
      gene_set_group_id: this.gene_set_group_id,
    });

    this.gene_set_names.push(name);
  }
};

GeneSetGroup.prototype.endOfFile = function () {
  if (this.wranglerPeek) {
    this.insertWranglerDocument.call(this, {
      document_type: "new_gene_set_collection",
      contents: {
        name: this.wranglerFile.options.name,
        description: this.wranglerFile.options.description,
        gene_set_count: this.gene_set_count,
      }
    });
  } else {
    // make the gene set visible, put in the names
    var user = Meteor.users.findOne(this.wranglerFile.user_id);

    var deferred = Q.defer();
    var self = this;

    // first, insert the bulk we've built up
    this.geneSetsBulk.execute(function (error, result) {
      if (error) { deferred.reject(error); }
      else {
        // use GeneSetGroups.rawCollection because SimpleSchema hands when
        // arrays are very large (10,000+ elements)
        GeneSetGroups.rawCollection().update({_id: self.gene_set_group_id }, {
          $set: {
            collaborations: [ user.collaborations.personal ],
            gene_set_names: self.gene_set_names,
            gene_set_count: self.gene_set_names.length,
          }
        }, errorResultResolver(deferred));
      }
    });
  }
};

WranglerFileHandlers.GeneSetGroup = GeneSetGroup;
