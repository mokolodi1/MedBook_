GeneSets = new Meteor.Collection("gene_sets");

// A gene set can either be part of a gene set group (gene_set_group_id
// is set) or it can be its own object with collaboration security
// and a bunch of required metadata fields.
// NOTE: In this file I'm using the word metadata to refer to fields
// that aren't set if the gene set is part of a gene set group.

SimpleSchema.messages({
  "metadataAndGeneSetGroupIncompatible":
      "You cannot define metadata fields and also gene_set_group_id.",
});

// - require if the field isn't set
// - error if the field is set and this field is set as well
function requireIfUnset (fieldName, isReallyOptional) {
  if (this.field(fieldName).isSet) {
    if (this.isSet) { return "metadataAndGeneSetGroupIncompatible"; }
  } else {
    if (!isReallyOptional && !this.isSet) { return "required"; }
  }
}

GeneSets.attachSchema(new SimpleSchema({
  name: { type: String },
  description: {
    type: String,
    optional: true,

    // NOTE: this field really is optional, unlike most of them
    custom: _.partial(requireIfUnset, "gene_set_group_id", true),
  },

  collaborations: {
    type: [String],
    optional: true,
    custom: _.partial(requireIfUnset, "gene_set_group_id"),
  },

  gene_label_field: { type: String, label: "Genes" },
  fields: recordFields([ "String", "Number" ]),

  gene_labels: { type: [String], min: 1 },

  gene_set_group_id: {
    type: String,
    optional: true,
    // still have to require this if collaborations isn't set
    // (collaborations is an arbitrary metadata field)
    custom: _.partial(requireIfUnset, "collaborations"),
  },
}));
