GeneSets = new Meteor.Collection("gene_sets");

// A gene set can either be part of a gene set group (gene_set_group_id
// is set) or it can be its own object with collaboration security
// and a bunch of required metadata fields.
// NOTE: In this file I'm using the word metadata to refer to fields
// that aren't set if the gene set is part of a gene set group.

SimpleSchema.messages({
  "metadataAndGeneSetGroupIncompatible":
      "You cannot define metadata fields and also gene_set_group_id.",
  "collabsAssociatedObjMutuallyExclusive":
      "You must set either collaborations or associated_object, but not both.",
});

function requireIfUnset (fieldName, anotherFieldName) {
  // error if fieldName or anotherFieldName is set and
  // this field is set as well
  if (this.field(fieldName).isSet || this.field(anotherFieldName).isSet) {
    if (this.isSet) {
      return "metadataAndGeneSetGroupIncompatible";
    }
  } else {
    // require if neither field is set
    if (!this.isSet) {
      return "required";
    }
  }
}

var fields = recordFields([ "String", "Number" ]);
// define up here so that the custom function doesn't reference
// itself (aka the new custom function)
var fieldsCustom = fields.custom;

function exclusivelyRequire(otherFieldName) {
  var groupError = requireIfUnset.call(this, "gene_set_group_id");

  if (groupError === "required") {
    if ((this.isSet && this.field(otherFieldName).isSet) ||
        (!this.isSet && !this.field(otherFieldName.isSet))) {
      return "collabsAssociatedObjMutuallyExclusive";
    }
  } else if (groupError) {
    return groupError;
  }
}

GeneSets.attachSchema(new SimpleSchema({
  name: { type: String },
  description: {
    type: String,
    optional: true,
  },

  collaborations: {
    type: [String],
    optional: true,
    custom: _.partial(exclusivelyRequire, "associated_object"),
  },

  gene_label_field: {
    type: String,
    label: "Genes",
    optional: true,
    custom: _.partial(requireIfUnset, "gene_set_group_id")
  },
  fields: _.extend(fields, {
    optional: true,

    // call both custom functions, one after the other
    custom: function () {
      if (this.value) {
        var fieldsError = fieldsCustom.call(this);

        if (fieldsError) { return fieldsError; }
      }

      return requireIfUnset.call(this, "gene_set_group_id");
    },
  }),

  gene_labels: { type: [String], min: 1 },
  // gene_count: { type: Number },

  gene_set_group_id: {
    type: String,
    optional: true,
    // still have to require this if collaborations isn't set
    // (collaborations is an arbitrary metadata field)
    custom: _.partial(requireIfUnset, "collaborations", "associated_object"),
  },

  associated_object: {
    type: new SimpleSchema({
      collection_name: {
        type: String,
        // allowedValues: [
        //   // "Patients",
        // ],
      },
      mongo_id: { type: String },
    }),
    optional: true,
    custom: _.partial(exclusivelyRequire, "collaborations")
  },

  // can put anything here
  metadata: {
    type: Object,
    blackbox: true,
    optional: true,
    custom: function () {
      // don't allow unless security is associated object
      if (!this.field("associated_object").isSet && this.isSet) {
        return "notAllowed";
      }
    },
  },
}));
