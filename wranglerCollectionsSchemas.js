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

var infoSchemas = {
  ClinicalForm: new SimpleSchema({
    header_names: {
      type: [String],
    },
  }),
};

SimpleSchema.messages({
  invalidInfoObject: "Invalid info given file type.",
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
      "genomic_expression",
      "gene_set_collection",
      "clinical",
      "metadata",
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

  // The info field holds information about a file that doesn't change
  // even when the options change. For example, it can hold a list of
  // headers to choose from in the options.
  info: {
    type: Object,
    optional: true,
    blackbox: true,
    custom: function () {
      var file_type = this.field("options").file_type;

      if (this.isSet && file_type) {
        var validationContext = infoSchemas[file_type].newContext();
        var isValid = validationContext.validate(clonedSampleGroup);

        if (!isValid) {
          return "invalidInfoObject";
        }
        console.log("valid info object");
      }
    },
  },

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

WranglerSubmissions.allow({
  insert: function (userId, submission) {
    var user = MedBook.ensureUser(userId);
    user.ensureAccess(submission);

    return submission.status === "editing";
  },
  update: function (userId, submission, fields, modifier) {
    var user = MedBook.ensureUser(userId);
    user.ensureAccess(submission);

    return submission.status === "editing";
  },
});

function verifyOptions (user, options) {
  if (options.study_id) {
    var study = Studies.findOne(options.study_id);
    user.ensureAccess(study);
  }

  if (options.data_set_id) {
    var dataSets = DataSets.findOne(options.data_set_id);
    user.ensureAccess(dataSets);
  }
}

WranglerFiles.allow({
  insert: function (userId, doc) {
    // get the whole document
    var wranglerFile = WranglerFiles.findOne(doc._id);

    var user = MedBook.ensureUser(userId);
    user.ensureAccess(wranglerFile);

    var submission = WranglerSubmissions.findOne(wranglerFile.submission_id);
    user.ensureAccess(submission);

    verifyOptions(user, wranglerFile.options);

    return submission.status === "editing";
  },
  update: function (userId, doc, fields, modifier) {
    // get the whole document
    var wranglerFile = WranglerFiles.findOne(doc._id);

    var user = MedBook.ensureUser(userId);
    user.ensureAccess(wranglerFile);

    var submission = WranglerSubmissions.findOne(wranglerFile.submission_id);
    user.ensureAccess(submission);

    verifyOptions(user, wranglerFile.options);

    return submission.status === "editing";
  },
});
