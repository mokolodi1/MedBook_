Meteor.methods({
  // Starts a new job with the given args. If a job already exists with
  // the given args, it instead returns the _id of that duplicate job.
  createUpDownGenes: function (formValues, customSampleGroup) {
    check(formValues, new SimpleSchema({
      data_set_or_patient_id: { type: String, label: "Data set or patient" },
      sample_label: { type: String, label: "Sample" },
      sample_group_id: { type: String, label: "Sample group" },
      iqr_multiplier: { type: Number, decimal: true },
    }));

    let user = MedBook.ensureUser(Meteor.userId());

    let {
      data_set_or_patient_id,
      sample_label,
      sample_group_id,
      iqr_multiplier,
    } = formValues;

    // if we need to create a new sample group, do so
    if (formValues.sample_group_id === "creating") {
      check(customSampleGroup, Object);
      sample_group_id = Meteor.call("createSampleGroup", customSampleGroup);
    }

    // security for the sample group
    let sampleGroup = SampleGroups.findOne(sample_group_id);
    user.ensureAccess(sampleGroup);

    let args = {
      sample_label,
      iqr_multiplier,
      sample_group_id,
      sample_group_name: sampleGroup.name,
    };

    // set args.data_set_id and args.data_set_name_or_patient_label
    if (data_set_or_patient_id.startsWith("patient-")) {
      let patientId = data_set_or_patient_id.slice("patient-".length);
      let patient = Patients.findOne(patientId);
      let sample = _.findWhere(patient.samples, { sample_label });

      args.data_set_id = sample.data_set_id;
      args.data_set_name_or_patient_label = patient.patient_label;

      // collaborations not necessarily loaded on client
      if (Meteor.isServer) user.ensureAccess(patient);
    } else if (data_set_or_patient_id.startsWith("data_set-")) {
      args.data_set_id = data_set_or_patient_id.slice("data_set-".length);

      let dataSet = DataSets.findOne(args.data_set_id);
      args.data_set_name_or_patient_label = dataSet.name;

      // collaborations not necessarily loaded on client
      if (Meteor.isServer) user.ensureAccess(dataSet);
    }

    // check to see if a job like this one has already been run,
    // and if so, return that job's _id
    // NOTE: I believe there could be a race condition here, but
    // I don't think Meteor handles more than one Meteor method at once.
    let duplicateJob = Jobs.findOne({ args });
    if (duplicateJob) {
      return duplicateJob._id;
    }

    return Jobs.insert({
      name: "UpDownGenes",
      status: "waiting",
      user_id: user._id,
      collaborations: [ user.personalCollaboration() ],
      args
    });
  },
  getSampleGroupVersion: function (name) {
    check(name, String);

    // return the next version given the sample group name
    // NOTE: this function only looks at the sample groups this user has
    // access to, which means sample groups are not necessarily uniquely
    // identifiable by { name, version }.

    let user = MedBook.ensureUser(Meteor.userId());

    let latestSampleGroup = SampleGroups.findOne({
      name,
      collaborations: { $in: user.getCollaborations() },
    }, { sort: { version: -1 } });

    if (latestSampleGroup) {
      return latestSampleGroup.version + 1
    }

    return 1; // default value
  },
  createSampleGroup: function (sampleGroup) {
    // NOTE: this method might produce "unclean" errors because I don't
    // feel like rewriting most of the schema for SampleGroups for the
    // check function (above)
    check(sampleGroup, Object);

    let user = MedBook.ensureUser(Meteor.userId());
    user.ensureAccess(sampleGroup);

    // sanity checks (complete with nice error messages)
    if (!sampleGroup.name) {
      throw new Meteor.Error("name-missing", "Name missing",
          "Please name your sample group.");
    }
    if (sampleGroup.data_sets.length === 0) {
      throw new Meteor.Error("no-data-sets", "No data sets",
          "Please add at least one data set to your sample group.");
    }

    // make sure the version is correct (aka don't trust the user)
    // TODO: when should we increment the version?
    // What if the samples are the same?
    sampleGroup.version =
        Meteor.call("getSampleGroupVersion", sampleGroup.name);

    // ensure uniqueness for data sets
    let uniqueDataSets = _.uniq(_.pluck(sampleGroup.data_sets, "_id"));
    if (uniqueDataSets.length !== sampleGroup.data_sets.length) {
      throw new Meteor.Error("non-unique-data-sets");
    }

    // filter through each data sets
    // - make sure they have access
    // - filter the samples
    sampleGroup.data_sets = _.map(sampleGroup.data_sets,
        (sampleGroupDataSet) => {
      let dataSet = DataSets.findOne(sampleGroupDataSet.data_set_id);
      user.ensureAccess(dataSet);

      // start with all the samples and then filter down from there
      let sample_labels = dataSet.sample_labels;

      _.each(sampleGroupDataSet.filters, (filter) => {
        let { options } = filter;

        if (filter.type === "sample_label_list") {
          if (_.difference(options.sample_labels,
              dataSet.sample_labels).length) {
            throw new Meteor.Error("invalid-sample-labels");
          }

          sample_labels = _.intersection(sample_labels, options.sample_labels);
        } else if (filter.type === "exclude_sample_label_list") {
          if (_.difference(options.sample_labels,
              dataSet.sample_labels).length) {
            throw new Meteor.Error("invalid-sample-labels");
          }

          sample_labels = _.difference(sample_labels, options.sample_labels);
        } else if (filter.type === "data_loaded") {
          if (options.gene_expression) {
            sample_labels = _.intersection(sample_labels,
                dataSet.gene_expression);
          }
        }else {
          throw new Meteor.Error("invalid-filter-type");
        }
      });

      sampleGroupDataSet.sample_labels = sample_labels;

      return sampleGroupDataSet; // NOTE: _.map at beginning
    });

    return SampleGroups.insert(sampleGroup)
  },
  removeSampleGroup: function (sampleGroupId) {
    check(sampleGroupId, String);

    let user = MedBook.ensureUser(Meteor.userId());
    user.ensureAccess(SampleGroups.findOne(sampleGroupId));

    SampleGroups.remove(sampleGroupId);
  },

  // jobs
  createLimmaGSEA: function (args) {
    check(args, new SimpleSchema({
      sample_group_a_id: { type: String },
      sample_group_b_id: { type: String },
      limma_top_genes_count: { type: Number, min: 1 },
      gene_set_collection_id: { type: String },
    }));

    let user = MedBook.ensureUser(Meteor.userId());

    let geneSetColl = GeneSetCollections.findOne(args.gene_set_collection_id);
    user.ensureAccess(geneSetColl);

    // ensure access to sample group, data sets inside
    _.each([
      args.sample_group_a_id,
      args.sample_group_b_id
    ], (sampleGroupId) => {
      let sampleGroup = SampleGroups.findOne(sampleGroupId);
      user.ensureAccess(sampleGroup);

      // data sets not necessarily loaded on client
      if (Meteor.isServer) {
        _.each(sampleGroup.data_sets, (dataSet) => {
          user.ensureAccess(DataSets.findOne(dataSet.data_set_id));
        });
      }
    });

    // add the sample group names in there to make joins on the client easy
    // TODO: don't do to SampleGroups.findOne()s
    _.extend(args, {
      sample_group_a_name: SampleGroups.findOne(args.sample_group_a_id).name,
      sample_group_b_name: SampleGroups.findOne(args.sample_group_b_id).name,
      gene_set_collection_name: geneSetColl.name,
    });

    // if it's been run before return that
    let duplicateJob = Jobs.findOne({ args });
    if (duplicateJob) {
      return duplicateJob._id;
    }

    return Jobs.insert({
      name: "RunLimmaGSEA",
      status: "waiting",
      user_id: user._id,
      collaborations: [ user.personalCollaboration() ],
      args,
    });
  },
  createTumorMapOverlay(args) {
    check(args, MedBook.jobSchemas.TumorMapOverlay.args);

    let user = MedBook.ensureUser(Meteor.userId());

    // group sample labels by data set id
    let samplesByDataSetId = {};
    _.each(args.samples, (sample) => {
      if (!samplesByDataSetId[sample.data_set_id]) {
        samplesByDataSetId[sample.data_set_id] = [];
      }

      samplesByDataSetId[sample.data_set_id].push(sample.sample_label)
    });

    let jobId = Jobs.insert({
      name: "TumorMapOverlay",
      status: "creating",
      user_id: user._id,
      collaborations: [ user.personalCollaboration() ],
      args,
    });

    // if it's on the server go get the bookmark
    if (Meteor.isServer) {
      this.unblock();

      // build up the sample (aka "nodes") data
      console.log("loading data for tumor map");
      let nodes = {};

      _.each(samplesByDataSetId, (sampleLabels, data_set_id) => {
        // data set security
        let dataSet = DataSets.findOne(data_set_id);
        user.ensureAccess(dataSet);

        // initialize nodes[sampleLabels] to put gene data there
        _.each(sampleLabels, (label) => { nodes[label] = {}; });

        // load the data for this data set
        Expression3.find({ data_set_id }).forEach((doc) => {
          _.each(sampleLabels, (sample_label) => {
            let sampleIndex = dataSet.gene_expression_index[sample_label];
            let expValue = doc.rsem_quan_log2[sampleIndex];

            nodes[sample_label][doc.gene_label] = expValue;
          });
        });
      });
      console.log("done loading data");

      // do this to allow non-SSL connections (I think)
      process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

      // do the API call
      apiResponse = HTTP.call("POST",
          "https://tumormap.ucsc.edu:8112/query/overlayNodes", {
        data: {
          map: "CKCC/v1",
          layout: "mRNA",
          nodes
        }
      });

      if (apiResponse.statusCode === 200) {
        Jobs.update(jobId, {
          $set: {
            status: "done",
            output: {
              // TODO: should be `bookmark`
              bookmark_url: apiResponse.data.bookmarks[0],
            }
          }
        });
      } else {
        Jobs.update(jobId, { $set: { status: "error" } });
      }
    }
  },

  // return a list of the collaborations this user can share with
  getSharableCollaborations: function () {
    let user = MedBook.ensureUser(this.userId);

    // TODO: who can we share with?
    let usersCursor = Meteor.users.find({}, {
      fields: { "collaborations.personal": 1 }
    });
    let usersPersonalCollabs =
        _.pluck(_.pluck(usersCursor.fetch(), "collaborations"), "personal");

    return _.union(usersPersonalCollabs, user.getCollaborations());
  },
  insertRecord: function(values) {
    check(values, Object);

    let nonValueFields = [
      "collaborations",
      "data_set_id",
      "form_id",
      "patient_label",
      "sample_label",
    ];

    // remove added fields so that values is just the values
    let record = _.pick(values, nonValueFields);
    record.values = _.omit(values, nonValueFields);

    let user = MedBook.ensureUser(Meteor.userId());
    user.ensureAccess(Forms.findOne(record.form_id));
    user.ensureAccess(DataSets.findOne(record.data_set_id));
    user.ensureAccess(record.collaborations);

    Records.insert(record);
  },
  insertForm: function(newForm) {
    check(newForm, Forms.simpleSchema());

    let user = MedBook.ensureUser(Meteor.userId());
    user.ensureAccess(newForm);
    Forms.insert(newForm);
  },
  insertCollaboration(newCollaboration) {
    check(newCollaboration, Collaborations.simpleSchema());

    var user = MedBook.ensureUser(Meteor.userId());
    // they must be an admin of the collaboration they create
    user.ensureAdmin(newCollaboration);

    if (Meteor.call("collabNameTaken", newCollaboration.name)) {
      throw new Meteor.Error("collaboration-name-taken");
    }

    return Collaborations.insert(newCollaboration);
  },
  collabNameTaken: function (collabName) {
    check(collabName, String);

    return !!Collaborations.findOne({name: collabName});
  },
  removeCollaboration(collaborationId) {
    check(collaborationId, String);

    let user = MedBook.ensureUser(this.userId);
    let collab = Collaborations.findOne(collaborationId);
    user.ensureAdmin(collab);

    // remove all collaborators and administrators so that no one can edit it
    // but no one can create one with that name
    Collaborations.update(collaborationId, {
      $set: {
        collaborators: [],
        administrators: [],
      }
    });
  },
  updateCollaboration(collaborationId, updateFields) {
    check(collaborationId, String);
    check(updateFields, new SimpleSchema({
      description: { type: String, optional: true },
      publiclyListed: { type: Boolean, optional: true },
      adminApprovalRequired: { type: Boolean, optional: true },
      administrators: { type: [String], optional: true },
      collaborators: { type: [String], optional: true },
    }));

    let user = MedBook.ensureUser(this.userId);
    let collab = Collaborations.findOne(collaborationId);
    user.ensureAdmin(collab);

    // make sure they're not doing anything illegal
    if (updateFields.administrators &&
        updateFields.administrators.length === 0) {
      throw new Meteor.Error("no-administrators");
    }

    Collaborations.update(collaborationId, {
      $set: updateFields
    });
  },
  joinCollaboration(collaborationId) {
    check(collaborationId, String);

    let user = MedBook.ensureUser(this.userId);
    let collab = Collaborations.findOne(collaborationId);

    // either add them to the collaboration or to the requests list
    if (collab.adminApprovalRequired) {
      Collaborations.update(collaborationId, {
        $addToSet: {
          requestsToJoin: {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            email: user.collaborations.email_address,
            personalCollaboration: user.personalCollaboration(),
          },
        }
      });

      // send an email to the admins so they know they need to approve people
      this.unblock();

      function getEmails(collabNames) {
        // NOTE: will be very slow if there are many names
        return _.uniq(_.flatten(_.map(collabNames, (name) => {
          let user = MedBook.findUser({
            "collaborations.personal": name
          });

          // if it's a user grab the email otherwise email all
          // associated collaborators
          if (user) {
            return user.email();
          } else {
            let collab = Collaborations.findOne({ name });

            return getEmails(collab.getAssociatedCollaborators());
          }
        })));
      }

      let to = getEmails(collab.administrators);
      let cc = user.collaborations.email_address;

      let requestorName = user.profile.firstName + " " + user.profile.lastName;
      let subject = requestorName + " is requesting access to the " +
          collab.name + " collaboration in MedBook";

      let url = "https://medbook.io/patient-care/collaborations" +
          "?collaboration_id=" + collab._id;
      let html = "You can view pending requests for access " +
          "<a href=" + url + ">here</a>. <br><br>Email " + requestorName +
          " at <a href=mailto:" + user.email() + ">" + user.email() + "</a>.";

      Email.send({
        from: "ucscmedbook@gmail.com",
        to, cc, subject, html,
      });
    } else {
      Collaborations.update(collaborationId, {
        $addToSet: {
          collaborators: user.personalCollaboration(),
        }
      });

      // if they've joined the collaboration successfully return the _id
      return collaborationId
    }
  },
  leaveCollaboration(collaborationId) {
    check(collaborationId, String);

    let user = MedBook.ensureUser(this.userId);
    let collab = Collaborations.findOne(collaborationId);
    user.ensureAccess(collab.name);

    Collaborations.update(collaborationId, {
      $pull: {
        collaborators: user.personalCollaboration(),
      }
    });
  },
  setProfileName(firstAndLastName) {
    check(firstAndLastName, new SimpleSchema({
      firstName: { type: String },
      lastName: { type: String },
    }));

    let user = MedBook.ensureUser(this.userId);

    Meteor.users.update(user._id, {
      $set: {
        "profile.firstName": firstAndLastName.firstName,
        "profile.lastName": firstAndLastName.lastName,
      }
    });
  },
  approveOrDenyCollaborator(collaborationId, personalCollaboration,
      approvedIfTrue) {
    check([collaborationId, personalCollaboration], [String]);
    check(approvedIfTrue, Boolean);

    let user = MedBook.ensureUser(this.userId);
    let collab = Collaborations.findOne(collaborationId);
    user.ensureAdmin(collab);

    // always remove the request
    let pullObject = {
      requestsToJoin: {
        personalCollaboration,
      }
    };

    let modifier;
    if (approvedIfTrue) {
      modifier = {
        $addToSet: {
          collaborators: personalCollaboration
        },
        $pull: pullObject,
      }
    } else {
      modifier = { $pull: pullObject };
    }

    Collaborations.update(collaborationId, modifier);

    // send the email telling them if they were accepted or rejected
    this.unblock();

    let addingUser = MedBook.findUser({
      "collaborations.personal": personalCollaboration
    });
    let to = addingUser.email();
    let subject;
    let html;

    if (approvedIfTrue) {
      subject = "Access to " + collab.name + " approved";

      html = "Your request for access to the " + collab.name +
          " collaboration in MedBook has been approved! " +
          "<br><br>Access MedBook at " +
          "<a href=https://medbook.io>medbook.io</a>.";
    } else {
      subject = "Access to " + collab.name + " rejected";

      let rejectEmail = user.email();
      html = "Your request for access to the " + collab.name +
          " collaboration in MedBook has been rejected. <br><br>" +
          "Please contact " +
          "<a href=mailto:" + rejectEmail + ">" + rejectEmail +
          "</a> for more information.";
    }

    Email.send({
      from: "ucscmedbook@gmail.com",
      to, subject, html,
    });
  },

  // shareAndDeleteButtons
  removeObject(collectionName, mongoId) {
    check([collectionName, mongoId], [String]);

    let user = MedBook.findUser(Meteor.userId());
    let object = MedBook.collections[collectionName].findOne(mongoId);
    user.ensureAccess(object);

    let removeAllowedCollections = [ "Jobs", "DataSets" ];
    if (removeAllowedCollections.indexOf(collectionName) === -1) {
      return new Meteor.Error("permission-denied");
    }

    // do some collection-specific checking before actually removing the object
    if (collectionName === "Jobs") {
      let deleteableJobs = [
        "RunLimmaGSEA",
        "TumorMapOverlay",
      ];

      if (deleteableJobs.indexOf(object.name) === -1) {
        return new Meteor.Error("permission-denied");
      }
    }

    MedBook.collections[collectionName].remove(mongoId);
  },
  updateObjectCollaborations(collectionName, mongoId, collaborations) {
    check([collectionName, mongoId], [String]);
    check(collaborations, [String]);

    let user = MedBook.findUser(Meteor.userId());
    let collection = MedBook.collections[collectionName];
    let object = collection.findOne(mongoId);
    user.ensureAccess(object);

    collection.update(mongoId, {
      $set: { collaborations }
    });
  },

  // manage data sets
  insertDataSet(newDataSet) {
    check(newDataSet, DataSets.simpleSchema().pick(["name", "description"]));

    var user = MedBook.ensureUser(Meteor.userId());

    newDataSet.collaborations = [ user.personalCollaboration() ];
    return DataSets.insert(newDataSet);
  },
  newSampleLabel(sampleDefinition) {
    check(sampleDefinition, new SimpleSchema({
      data_set_id: { type: String },
      sample_label: { type: String },
    }));

    let user = MedBook.findUser(Meteor.userId());
    user.ensureAccess(DataSets.findOne(sampleDefinition.data_set_id));

    DataSets.update(sampleDefinition.data_set_id, {
      $push: {
        sample_labels: sampleDefinition.sample_label
      }
    });
  },
});
