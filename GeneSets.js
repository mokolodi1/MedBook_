// GeneSets describes gene set objects—-each object describes a single gene set
// which may or may not be part of a larger set of gene sets. The collection
// describing these sets of gene sets is GeneSetCollections.

GeneSets = new Meteor.Collection("gene_sets");

GeneSets.attachSchema(new SimpleSchema({
  name: { type: String },
  description: { type: String, optional: true },

  gene_labels: { type: [String], min: 1 },
  gene_set_collection_id: { type: String },

  // TODO: maybe include if we want people to be able to share single gene sets
  // collaborations: { type: [String] },
}));
