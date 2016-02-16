Jobs = new Meteor.Collection("jobs");

Jobs.attachSchema(new SimpleSchema({
  // fields needed to insert a Job
  name: {
    type: String,
    // TODO: depend on Jobs package
    allowedValues: [
      "ParseWranglerFile",
      "SubmitWranglerFile",
      "SubmitWranglerSubmission",
      "FinishWranglerSubmission",
      "RunLimma",
      "RunApplySignature",
      "RunViper",
      "ExportFile",
      "ReloadGenesCollection",
      "GeneTranscriptMappings",
      "UpDownGenes",
    ],
  },
  user_id: { type: Meteor.ObjectID },
  args: { // input
    type: Object,
    blackbox: true,
  },

  timeout_length: {
    type: Number,
    defaultValue: 7 * 24 * 60 * 60 * 1000, // a week
  },

  // optional fields
  prerequisite_job_ids: {
    type: [Meteor.ObjectID],
    defaultValue: [],
  },

  output: {
    type: Object,
    blackbox: true,
    optional: true,
  },

  // automatically generated fields
  date_created: { type: Date, autoValue: dateCreatedAutoValue },
  date_modified: { type: Date, autoValue: dateModifiedAutoValue },
  status: {
    type: String,
    allowedValues: [
      "creating",
      "waiting",
      "running",
      "done",
      "error",
    ],
    defaultValue: "waiting",
  },
  retry_count: { type: Number, defaultValue: 0 },
  // can be set even if status is not "error"
  error_description: { type: String, optional: true },
  stack_trace: { type: String, optional: true },
}));

function onlyAdminCollaboration (user_id, doc) {
  var user = Meteor.users.findOne(user_id);

  return user.profile &&
      user.profile.collaborations instanceof Array &&
      user.profile.collaborations.indexOf("Admin") >= 0 &&
      doc.status === "creating" || doc.status === "waiting";
}

// we don't want a user to be able to create a "ReloadGenesCollection" job
Jobs.allow({
  insert: onlyAdminCollaboration,
  update: onlyAdminCollaboration,
  remove: onlyAdminCollaboration,
  fetch: ["status"],
});
