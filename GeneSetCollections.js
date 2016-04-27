// http://www.broadinstitute.org/cancer/software/gsea/wiki/index.php/
// Data_formats#GMT:_Gene_Matrix_Transposed_file_format_.28.2A.gmt.29

// This collection describes a colleciton of gene sets.

GeneSetCollections = new Meteor.Collection("gene_set_collections");

GeneSetCollections.attachSchema(new SimpleSchema({
  name: { type: String },
  description: { type: String, optional: true },
  collaborations: { type: [String] },
}));
