WranglerSubmissions.attachSchema(new SimpleSchema({
  user_id: { type: Meteor.ObjectID },
  date_created: { type: Date },
  status: {
    type: String,
    allowedValues: [
      "editing",
      "validating",
      "writing",
      "done",
    ],
  },
  errors: { // errors as of last submission
    type: [String],
    optional: true,
  },
  options: {
    type: Object,
    blackbox: true,
    optional: true,
  },
}));

// allowedValues for submission_type in WranglerFiles
var submissionTypes = [];
// allowedValues for document_type in WranglerDocuments
var panelNames = [];
_.each(Wrangler.reviewPanels, function (fileTypes, key) {
  submissionTypes.push(key);

  _.each(fileTypes, function (panel) {
    panelNames.push(panel.name);
  });
});

var fileTypeNames = _.map(Wrangler.fileTypes, function (value, file_type) {
  return {
    file_type: file_type,
    description: value.description,
  };
});
WranglerFiles.attachSchema(new SimpleSchema({
  submission_id: { type: Meteor.ObjectID },
  user_id: { type: Meteor.ObjectID },

  submission_type: {
    type: String,
    allowedValues: [
      "gene_set_collection",
      "clinical",
    ],
    optional: true,
  },

  blob_id: { type: Meteor.ObjectID },
  blob_name: { type: String },
  blob_text_sample: { type: String, optional: true },
  blob_line_count: { type: Number, optional: true },
  status: {
    type: String,
    allowedValues: [
      "uploading",
      "processing",
      "done",
      "error",
    ],
  },
  options: {
    type: new SimpleSchema([
      // NOTE: the schema is blackboxed, but it still contains file_type
      // so that autoform can be used in Wrangler
      {
        file_type: {
          type: String,
          allowedValues: _.pluck(fileTypeNames, "file_type"),
          autoform: {
            options: _.map(fileTypeNames, function (value) {
              return { label: value.description, value: value.file_type };
            }),
          },
          optional: true,
        },
      },
    ]),
    defaultValue: {},
    blackbox: true,
  },
  // has it gone through the options parsing part of ParseWranglerFile
  parsed_options_once_already: { type: Boolean, defaultValue: false },

  written_to_database: { type: Boolean, defaultValue: false },
  error_description: { type: String, optional: true },
}));

WranglerDocuments.attachSchema(new SimpleSchema({
  submission_id: { type: Meteor.ObjectID },
  user_id: { type: Meteor.ObjectID },
  wrangler_file_ids: {
    type: [Meteor.ObjectID],
    optional: true,
    defaultValue: [],
  },
  document_type: {
    type: String,
    allowedValues: _.uniq(panelNames),
  },
  contents: {
    type: Object,
    blackbox: true,
  },
}));

// XXX: test this
function verifyOptions (options) {
  console.log("verifying access");

  if (options.study_label) {
    console.log("checking study label");
    var study = Studies.findOne({ study_label: options.study_label });
    user.ensureAccess(study);
    console.log("study label okay");
  }

  if (options.data_set_id) {
    var dataSets = DataSets.findOne({ data_set_id: options.data_set_id });
    user.ensureAccess(dataSets);
  }
}

WranglerSubmissions.allow({
  insert: function (userId, doc) {
    var user = MedBook.ensureUser(userId);
    user.ensureAccess(doc);

    verifyOptions(user, doc.options);

    return submission.status === "editing";
  },
  update: function (userId, doc, fields, modifier) {
    // var submission = WranglerSubmissions.findOne(doc._id);

    var user = MedBook.ensureUser(userId);
    user.ensureAccess(doc);

    verifyOptions(user, doc.options);

    return doc.status === "editing";
  },
});

function makePermissions (collection) {
  return {
    insert: function (userId, doc) {
      var submission = WranglerSubmissions.findOne(doc.submission_id);

      return doc.user_id === userId &&
          submission.user_id === userId;
    },
    update: function (userId, doc, fields, modifier) {
      var wholeDoc = collection.findOne(doc._id);
      var submission = WranglerSubmissions.findOne(wholeDoc.submission_id);

      return submission.user_id === userId &&
          submission.status === "editing";
    },
  };
}

// NOTE: don't want people to be able to add just any document
// WranglerDocuments.allow(makePermissions(WranglerDocuments));
WranglerFiles.allow(makePermissions(WranglerFiles));

getCollectionByName = function(collectionName) {
  switch (collectionName) {
    case "superpathway_elements":
      return SuperpathwayElements;
    case "superpathway_interactions":
      return SuperpathwayInteractions;
    case "mutations":
      return Mutations;
    case "gene_expression":
      return GeneExpression;
    case "superpathways":
      return Superpathways;
    default:
      throw new Error("couldn't find appropriate schema");
      return null;
  }
};
