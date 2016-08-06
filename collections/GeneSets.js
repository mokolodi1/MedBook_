GeneSets = new Meteor.Collection("gene_sets");

// A gene set can either be part of a gene set group (gene_set_group_id
// is set) or it can be its own object with collaboration security
// and a bunch of required metadata fields.
// NOTE: In this file I'm using the word metadata to refer to fields
// that aren't set if the gene set is part of a gene set group.

SimpleSchema.messages({
  "metadataAndGeneSetGroupIncompatible":
      "You cannot define metadata fields and also gene_set_group_id.",
  "invalidFeatureColumnValues":
      "Gene set feature values are invalid.",
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

  features: {
    blackbox: true,
    min: 1,
    type: [ new SimpleSchema({
      // TODO: should we call this gene_label because it's a GENE set?
      feature_label: {
        type: String,
        // we need this custom function because the features object
        // is blackboxed
        custom: function () {
          if (!this.isSet) { return "required"; }
          if (typeof this.value !== "string") { return "expectedString"; }
        },
      },

      // TODO: should these be stored here or in the columns part
      column_values: {
        type: [Object],
        optional: true,
        custom: _.partial(requireIfUnset, "gene_set_group_id"),
        custom: function () {
          // require column_values if columns is set
          if (this.field("columns").isSet && !this.isSet) {
            return "required";
          }

          // validate this fields with the value types in the columns field
          var columns = this.field("columns").value;
          var values = this.value;

          // ensure identical length
          if (columns.length !== values.length) {
            return "invalidFeatureColumnValues";
          }

          // ensure values match value types
          for (var i = 0; i < columns.length; i++) {
            var value_type = columns[i].value_type;
            var value = values[i];


            if (value_type === "String") {
              if (!(typeof value === "string")) {
                return "invalidFeatureColumnValues";
              }
            } else if (value_type === "Number") {
              if (!(typeof value === "number")) {
                return "invalidFeatureColumnValues";
              }
            } else {
              console.log("You forgot to add the value_type to the custom " +
                  "validation for column_values!");
              return "notAllowed";
            }
          }
        },
      },
    }) ],
  },

  // NOTE: not super psyched about this name (also change column_values)
  columns: {
    type: [ new SimpleSchema({
      header: { type: String },
      value_type: {
        type: String,
        allowedValues: [
          "String",
          "Number",
        ],
      },
    }) ],
    optional: true,
    custom: _.partial(requireIfUnset, "gene_set_group_id"),
  },

  // TODO: possibly gene_set_group_ids?
  gene_set_group_id: {
    type: String,
    optional: true,
    // still have to require this if collaborations isn't set
    // (collaborations is an arbitrary metadata field)
    custom: _.partial(requireIfUnset, "collaborations"),
  },
}));
