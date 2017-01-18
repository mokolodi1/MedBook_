let Future = Npm.require('fibers/future');

Meteor.methods({
  // Starts an UpDownGenes job for each of the sample_labels. If a job already
  // exists, the duplicate job is returned.
  // Returns an array of job _ids
  createUpDownGenes: function (formValues, collaborations, customSampleGroup) {
    check(formValues, new SimpleSchema({
      data_set_id: { type: String },
      sample_labels: { type: [String] },
      sample_group_id: { type: String },
      iqr_multiplier: { type: Number, decimal: true },
      use_filtered_sample_group: {type: Boolean },
    }));
    check(collaborations, [String]);
    check(customSampleGroup, Match.Maybe(Object));

    let user = MedBook.ensureUser(Meteor.userId());
    // data set and sample group security is below...

    let {
      data_set_id,
      sample_labels,
      sample_group_id,
      iqr_multiplier,
      use_filtered_sample_group,
    } = formValues;

    let dataSet = DataSets.findOne(data_set_id);
    user.ensureAccess(dataSet);

    // if we need to create a new sample group, do so
    if (formValues.sample_group_id === "creating") {
      this.unblock();

      let creatingError;
      Meteor.call("createSampleGroup", customSampleGroup, (err, ret) => {
        // NOTE: this callback is executed before the Meteor.call returns

        creatingError = err;
        sample_group_id = ret;
      });

      // if there was a problem with that one, throw the associated error
      if (creatingError) throw creatingError;
    }

    // security for the sample group
    let sampleGroup = SampleGroups.findOne(sample_group_id);
    user.ensureAccess(sampleGroup);

    // If this job uses the gene filters on the sample group,
    // and they're not already generated,
    // queue a job to generate them and set it as a prerequisite
    // for the outlier analysis job.
    let prerequisite_job_ids = [];
    if(use_filtered_sample_group){
      // check the sample group for a gene-filter blob
      let foundFilter = Blobs2.findOne({
        "associated_object.collection_name":"SampleGroups",
        "associated_object.mongo_id":sample_group_id,
        "metadata.type":"ExprAndVarFilteredSampleGroupData",
      });
      if(!foundFilter){
        // No existing filters -- queue a new job to create them
        prerequisite_job_ids.push(Jobs.insert({
          name: "ApplyExprAndVarianceFilters",
          status: "waiting",
          user_id: user._id,
          collaborations: [ user.personalCollaboration() ],
          args: {"sample_group_id":sample_group_id},
        }));
      }
    }

    if (!user.hasAccess(collaborations)) {
      throw new Meteor.Error("must-have-access-to-create",
          "You won't have access!",
          "You can only create jobs that you will have access to. " +
          "Please add yourself as a collaborator to continue.");
    }

    // args shared by all jobs to be created in just a moment
    let sameArgs = {
      data_set_id,
      data_set_name: dataSet.name,
      iqr_multiplier,
      sample_group_id,
      sample_group_name: sampleGroup.name,
      sample_group_version: sampleGroup.version,
      use_filtered_sample_group,
    };

    return _.map(sample_labels, (sample_label) => {
      // figure out the args for this job
      var args = _.clone(sameArgs);
      args.sample_label = sample_label;

      // insert the job
      Jobs.insert({
        name: "UpDownGenes",
        status: "waiting",
        user_id: user._id,
        collaborations,
        args,
        prerequisite_job_ids
      });
    });
  },
  createSampleGroup: function (sampleGroup) {
    check(sampleGroup, new SimpleSchema({
      name: { type: String },
      version: { type: Number, min: 1 },
      collaborations: { type: [String] },

      filtered_sample_sources: {
        type: [
          new SimpleSchema({
            collection_name: {
              type: String,
              allowedValues: [ "DataSets", "SampleGroups", ],
            },
            mongo_id: { type: String },

            filters: {
              type: [Object],

              // NOTE: we do a thorough check of this before inserting
              blackbox: true,
            },
          })
        ]
      },
    }));

    let user = MedBook.ensureUser(Meteor.userId());
    user.ensureAccess(sampleGroup);

    // sanity checks (complete with nice error messages)
    if (!sampleGroup.name) {
      throw new Meteor.Error("name-missing", "Name missing",
          "Please name your sample group.");
    }
    if (sampleGroup.filtered_sample_sources.length === 0) {
      throw new Meteor.Error("no-data-sources", "No data sources",
          "Please add at least one data set or sample group " +
          "to your sample group.");
    }

    // make sure the version is correct (aka don't trust the user)
    // TODO: when should we increment the version?
    // What if the samples are the same?
    sampleGroup.version =
        Meteor.call("getSampleGroupVersion", sampleGroup.name);

    // ensure uniqueness for data sets/sample groups
    let sourceDescriptors = _.map(sampleGroup.filtered_sample_sources,
        (source) => {
      return `${source.collection_name}/${source.mongo_id}`;
    });
    if (_.uniq(sourceDescriptors).length !==
        sampleGroup.filtered_sample_sources.length) {
      // don't need a nice description because this shouldn't happen:
      // the uniqueness is handled by the client
      throw new Meteor.Error("non-unique-data-sets");
    }

    // keep track of each sample label, throw an error if a label exists in
    // multiple data sets
    let sampleLabelHash = {};

    // Store each source's sample labels list in a hash map
    // organized by data set _id. This is used at the end to compute
    // the data_sets attribute.
    // We use a hash here because samples can potentially be added twice from
    // two sources.
    let dsSampleLabelHash = {};

    // utility function for adding to the dsSampleLabelHash
    function addToDSSampleLabelHash(dataSetId, sampleLabels) {
      dsSampleLabelHash[dataSetId] = {};

      _.each(sampleLabels, (label) => {
        dsSampleLabelHash[dataSetId][label] = true;
      });
    }

    // Store each source's feature labels list to the hash map
    // organized by source description: `${collection_name}/${mongo_id}`
    // This is used at the end to compute the intersection of the feature
    // labels.
    let sourceFeaturesHash = {};

    // Store the feature labels of the first source in the sample group
    // for use later on.
    let masterFeatureLabels;

    // filter through each source
    sampleGroup.filtered_sample_sources =
        _.map(sampleGroup.filtered_sample_sources, (sgSource) => {
      let collection = MedBook.collections[sgSource.collection_name];
      let fetchedSource = collection.findOne(sgSource.mongo_id);
      user.ensureAccess(fetchedSource);

      // make sure they're all the same type
      if (!sampleGroup.value_type) {
        // infer from the data sets for now
        sampleGroup.value_type = fetchedSource.value_type;
      }

      if (fetchedSource.value_type !== sampleGroup.value_type) {
        throw new Meteor.Error("mixed-value-types", "Mixed value types",
            "You can only create a sample group with sources " +
            "of a single value type.");
      }

      // set the name and unfiltered_sample_count
      sgSource.name = fetchedSource.name;
      sgSource.unfiltered_sample_count = fetchedSource.sample_labels.length;

      // Apply the sample group's filters.
      // We start with all the sample labels in a data set.
      // Then, apply filters as follows.
      // -  Filter by form values: Run the passed query in mongo and remove
      //    all samples that are not included in the query results
      // -  Include Specific Samples: remove all samples NOT on the include list
      // -  Exclude Specific Samples: remove all samples on the exclude list
      let { sample_labels } = fetchedSource;

      // make a copy of the whole list before filtering
      let allSamples = sample_labels;

      _.each(sgSource.filters, (filter) => {
        let { options } = filter;

        if (filter.type === "form_values"){
          if (!options.mongo_query) {
            throw new Meteor.Error("mongo-query-empty",
                "Not done editing filters",
                "Please click done to continue.");
          }

          // Run the mongo_query
          // Get the result sample labels synchronously
          let result_sample_labels = Meteor.call('getSamplesFromFormFilter',
            {
              collection_name: sgSource.collection_name,
              mongo_id: sgSource.mongo_id,
            },
            options.mongo_query,
            options.form_id
          );

          console.log("Query found", result_sample_labels.length,
              "sample labels.");

          sample_labels = _.intersection(sample_labels, result_sample_labels);
        } else if (filter.type === "include_sample_list") {
          if (_.difference(options.sample_labels, allSamples).length) {
            throw new Meteor.Error("invalid-sample-labels");
          }

          sample_labels = _.intersection(sample_labels, options.sample_labels);
        } else if (filter.type === "exclude_sample_list") {
          if (_.difference(options.sample_labels, allSamples).length) {
            throw new Meteor.Error("invalid-sample-labels");
          }

          sample_labels = _.difference(sample_labels, options.sample_labels);
        } else {
          throw new Meteor.Error("invalid-filter-type");
        }

        // set the sample_count for include/exclude lists
        if (filter.type === "include_sample_list" ||
            filter.type === "exclude_sample_list") {
          filter.options.sample_count = filter.options.sample_labels.length;
        }
      });

      if (sample_labels.length === 0) {
        throw new Meteor.Error("source-empty", "No samples found",
            `Specified filters for ${fetchedSource.name} returned no ` +
            "samples. Remove filters or remove the data set or sample group " +
            "to continue.");
      }

      // set the working sample_labels list to be the list for the sample group
      sgSource.sample_labels = sample_labels;
      sgSource.sample_count = sample_labels.length;

      // add the source's features to the hash map
      let featuresHash = _.reduce(fetchedSource.feature_labels,
          (memo, label) => {
        memo[label] = true;
        return memo;
      }, {});

      let descriptor = `${sgSource.collection_name}/${sgSource.mongo_id}`;
      sourceFeaturesHash[descriptor] = featuresHash;

      if (!masterFeatureLabels) {
        masterFeatureLabels = fetchedSource.feature_labels;
      }

      // add all the samples to their respective data sets in the
      // dsSampleLabelHash so we can figure out where everything comes from
      if (sgSource.collection_name === "DataSets") {
        addToDSSampleLabelHash(sgSource.mongo_id, sgSource.sample_labels);
      } else if (sgSource.collection_name === "SampleGroups") {
        // add each of the data sets in the sample groups to the hash map
        let sgInSg = SampleGroups.findOne(sgSource.mongo_id);

        _.each(sgInSg.data_sets, (sgDataSet) => {
          addToDSSampleLabelHash(sgDataSet.data_set_id,
              sgDataSet.sample_labels);
        });
      } else {
        throw "invalid-collection_name";
      }

      // NOTE: _.map at beginning
      return sgSource;
    });

    // set the sample group's sample_labels
    sampleGroup.sample_labels = Object.keys(sampleLabelHash);



    // With dsSampleLabelHash populated, we can calculate the sources
    // of each of the samples. In this step we ensure that each sample is
    // only added once from each data set. (A sample can be "added twice",
    // for instance from two sample groups, so long as the sample's original
    // data set is the same.)
    let samplesAttachedToDataSet = {};

    sampleGroup.data_sets = _.map(dsSampleLabelHash,
        (sampleLabelHash, data_set_id) => {
      let dataSet = DataSets.findOne(data_set_id, {
        // Idk how much faster this makes it but there ya go
        fields: { name: 1 }
      });

      let sample_labels = Object.keys(sampleLabelHash);

      // make sure there aren't duplicate samples
      _.each(sample_labels, (label) => {
        if (samplesAttachedToDataSet[label]) {
          throw new Meteor.Error("duplicate-sample-label",
              "Sample from two data sets",
              `Sample ${label} has been added from two or more data sets: ` +
              `${samplesAttachedToDataSet[label]} and ${dataSet.name}. ` +
              "It's possible that these data sets were added as part of " +
              "a sample group.");
        }

        samplesAttachedToDataSet[label] = dataSet.name;
      });

      return {
        data_set_id,
        data_set_name: dataSet.name,
        sample_labels,
        sample_count: sample_labels.length,
      };
    });

    // Now that we have the sourceFeaturesHash populated, we can calculate
    // the intersection of the sources' sample labels
    let featureLabels = [];

    // for each label in the masterFeatureLabels, check to see if it's in
    // every data set
    masterFeatureLabels.forEach(function (featureLabel) {
      var inEachDataSet = true;

      // loop through the data sets
      sourceDescriptors.forEach(function (descriptor) {
        // if it's not in the data set, flip the flag
        if (!sourceFeaturesHash[descriptor][featureLabel]) {
          inEachDataSet = false;
        }
      });

      // push it to the master list if it's in every source
      if (inEachDataSet) {
        featureLabels.push(featureLabel);
      }
    });

    sampleGroup.feature_labels = featureLabels;

    // We can't use the regular SampleGroups.insert because SimpleSchema can't
    // handle inserting objects with very large arrays (ex. sample_labels).
    // Instead, handle the autoValues and check the schema manually...

    // clone object to be checked for the schema
    let clonedSampleGroup = JSON.parse(JSON.stringify(sampleGroup));

    // SimpleSchema can't handle large arrays, so use a fake array of strings
    function fakeSampleLabelsAndCount(item) {
      item.sample_labels = [ "yop/yop" ];
      item.sample_count = 1;
    }
    _.each(clonedSampleGroup.data_sets, fakeSampleLabelsAndCount);
    _.each(clonedSampleGroup.filtered_sample_sources, fakeSampleLabelsAndCount);
    clonedSampleGroup.feature_labels = [ "yop" ];
    clonedSampleGroup.sample_labels = [ "yop/yop" ];

    let validationContext = SampleGroups.simpleSchema().newContext();
    var isValid = validationContext.validate(clonedSampleGroup);
    if (!isValid) {
      console.log("Someone's doing something funky or there's a bug in " +
          "the UI code. User:", user._id);
      console.log("clonedSampleGroup:", clonedSampleGroup);
      console.log("validationContext.invalidKeys():",
          validationContext.invalidKeys());
      throw new Meteor.Error("invalid-sample-group");
    }

    // NOTE: might cause collisions (super unlikely)
    sampleGroup._id = Random.id();
    sampleGroup.date_created = new Date();

    // insert asynchronously -- thanks @ArnaudGallardo
    var future = new Future();
    SampleGroups.rawCollection().insert(sampleGroup, (err, insertedObj) => {
      // Need to either throw err, or return ID, but NOT BOTH
      // or will crash with "Future resolved more than once" error
      if (err) {
        console.log("Creating sample group threw Future error:", err);
        future.throw(err);
      } else {
        future.return(sampleGroup._id);
      }
    });

    return future.wait();
  },
  getRecords(collection_name, mongo_id) {
    check([collection_name, mongo_id], [String]);

    let user = MedBook.ensureUser(this.userId);
    let parentObj = MedBook.collections[collection_name].findOne(mongo_id);
    user.ensureAccess(parentObj);

    // make sure the collection name is valid, figure out the sort object
    let sortField;
    if (collection_name === "Forms") {
      sortField = parentObj.sample_label_field;
    } else if (collection_name === "GeneSets") {
      sortField = parentObj.gene_label_field;
    } else {
      throw new Meteor.Error("permission-denied");
    }

    // grab the records
    // NOTE: Sorting a query requires an index with that sorting attribute,
    // so we'll sort the records after fetching them so we can still take
    // advantage of using an index to fetch them. (Otherwise we'd have to
    // create an index for every gene/sample_label_field.)
    let records = Records.find({
      "associated_object.mongo_id": mongo_id,
      "associated_object.collection_name": collection_name,
    }).fetch();

    // sort the records
    return _.sortBy(records, sortField);
  },
  // Applies the expression and variance filters to a sample group
  // returns the upsert return value
  applyExprVarianceFilters(sampleGroupId) {
    // checks and permissions
    check(sampleGroupId, String);
    let user = MedBook.ensureUser(Meteor.userId());
    let sampleGroup = SampleGroups.findOne(sampleGroupId);
    user.ensureAccess(sampleGroup);

    // This job should never run more than once for
    // a sample group, so we should never need to search for
    // an existing filter blob & delete it. But we probably should,
    // just in case.
    return Jobs.upsert({
      name: "ApplyExprAndVarianceFilters",
      args: {
        sample_group_id: sampleGroupId,
      }
    }, {
      $setOnInsert: {
        status: "waiting",
        user_id: user._id,
        collaborations: [],

        // defaultValues don't work with upserts, so set some fields manually
        timeout_length: 7 * 24 * 60 * 60 * 1000, // a week
        prerequisite_job_ids: [],
        retry_count: 0,
      }
    });
  },

  // Get the genes that should have icons appear next to their names.
  // They are contained in a special geneSetGroup named
  // "GeneSets appearing as icons. Do not delete. oRZvz3Gbim"
  // To specify the icon & color, each gene_set's name should be, eg, "yellow star".
  // (this is a meteor method & not a publication so we can transform the find server-side)
  getGeneInfos(){
    let findBlessedSet = {"name":"GeneSets appearing as icons. Do not delete. oRZvz3Gbim"};

    let addExtraInfo = function(geneSet) {
      let genesWithInfo = {} ;
      genesWithInfo.color = geneSet.name.split(" ")[0];
      genesWithInfo.icon = geneSet.name.split(" ")[1];
      genesWithInfo.description = geneSet.description ;
      genesWithInfo.genes = geneSet.gene_labels;
      return genesWithInfo;
    };

    let howManyBlessed = GeneSetGroups.find(findBlessedSet).count();
    // If we don't find the collection -- OR someone else has attempted to hijack the icons by
    // making their own collection -- shut the whole thing down
    // TODO: This isn't the best implementation --
    // We need a better way / UI to indicate this collection.
    if(howManyBlessed !== 1){
      console.log("Can't determine which gene sets to display as icons.");
      return [];
    }
    let blessedGeneSet = GeneSetGroups.findOne(findBlessedSet);

    return GeneSets.find({
      gene_set_group_id: blessedGeneSet._id,
    }, {transform: addExtraInfo}).fetch();
  },

  createNewUser(email, password) {
    check([email, password], [String]);

    // Only allow logged-in users to create new users so that no one
    // can come along and start using our precious resources.
    let loggedInUser = MedBook.ensureUser(Meteor.userId());

    let newUserId = Accounts.createUser({
      email,
      password
    });
    console.log(`${loggedInUser.email()} created new user: ${email}`);

    return newUserId;
  },

  // remove a single sample from a data set
  // NOTE: If someone is reading data from a data set while this
  //       Meteor method is running, they could get bogus data. We need to
  //       put in soft-locks to prevent that before making a UI for this
  //       functionality.
  // TODO: perhaps have a flag on a data set where we can see if it's corrupt
  //       or not (in case a function like this fails). Currently if it fails,
  //       currently_wrangling will continue to be true and no one can modify
  //       the data set, but users can continue to read the data (running jobs
  //       or downloading the data).
  removeSampleFromDataSet(data_set_id, sampleIndex) {
    check(data_set_id, String);
    check(sampleIndex, Number);

    let user = MedBook.ensureUser(Meteor.userId());

    let dataSet = DataSets.findOne(data_set_id);
    user.ensureAccess(dataSet);

    // TODO: perhaps put this in if we make a UI for this. Commented out
    //       to reduce possible side-effects of unblocking the server.
    // this method takes a long time (~5 seconds) and we want other
    // things to be able to happen at the same time
    // this.unblock();

    // soft lock the data set, bail if we can't get a lock on it
    let modifiedCount = DataSets.update({
      _id: data_set_id,

      // This query attribute is the reason we can be sure the lock
      // doesn't go to two threads at the same time.
      currently_wrangling: false,
    }, {
      $set: {
        currently_wrangling: true
      }
    });
    if (modifiedCount !== 1) {
      throw new Meteor.Error("data-set-wrangling",
          "The data set is currently being modified elsewhere. " +
          "Please try again later.");
    }

    // validate the provided sampleIndex
    // NOTE: we need to do this after the soft lock because otherwise the
    //       data set could change out from under us
    if (sampleIndex < 0 || sampleIndex >= dataSet.sample_labels.length) {
      // we're going to bail out so unset the soft lock on the data set
      DataSets.update(data_set_id, {
        $set: {
          currently_wrangling: false
        }
      });

      throw new Meteor.Error("invalid-sample-index");
    }

    // calculate the new sample label array and index for the data set
    let { sample_labels } = dataSet;

    // remove the sample label from the array
    sample_labels.splice(sampleIndex, 1);

    // regenerate the index based on the new array
    let sample_label_index = _.reduce(sample_labels,
        (memo, sampleLabel, index) => {
      memo[sampleLabel] = index;
      return memo;
    }, {});

    // create a future in order to do some fun async stuff before the method
    // returns
    let future = new Future();

    // update the GenomicExpression documents
    // NOTE: There is no way to remove a given index from an array with mongo.
    //       It's been 6 YEARS and they still haven't scheduled the feature:
    //       https://jira.mongodb.org/browse/SERVER-1014
    // Instead of using a mongo modifier: we pull each document out of the db,
    // modify it, and then put it back. This requires N update commands where
    // N is the number of features in the data set.
    let promises = GenomicExpression.find({ data_set_id }).map((doc) => {
      let { values } = doc;

      // remove the value for the specified sample
      values.splice(sampleIndex, 1);

      // make a promise for this single update
      return new Promise((resolve, reject) => {
        // push the modified document back into the db
        GenomicExpression.rawCollection().update({ _id: doc._id }, {
          $set: { values }
        }, (error, result) => {
          if (error) { reject(error); }
          else { resolve(); }
        });
      });
    });

    // Wait until all of the genomic expression updates have completed and then
    // update the data set with the new sample information. Also unset the
    // soft lock because we're all done.
    Promise.all(promises)
      .then(() => {
        // use rawCollection because we don't have the Meteor environment
        // and also because SimpleSchema takes forever to validate large arrays
        DataSets.rawCollection().update({ _id: data_set_id }, {
          $set: {
            currently_wrangling: false,
            sample_labels,
            sample_label_index,
          }
        }, (error, result) => {
          if (error) {
            console.log("Error updating data set after removing single " +
                "sample from the data set genomic expression docs. The " +
                `data set ${dataSet.name} is now currupt: ${data_set_id}`);
            future.throw(error);
          } else {
            future.return();
          }
        });
      })
      .catch((error) => {
        console.log("Error removing single sample from data set! " +
            `The data set ${dataSet.name} may now be corrupt: ${data_set_id}`);
        console.log(error);
        future.throw(error);
      });

    // wait for future.throw or future.return to be called
    return future.wait();
  },

  // return a list of description objects for the given
  // list of collaborations
  getCollabDescriptions(collaborationNames) {
    check(collaborationNames, [String]);

    let user = MedBook.ensureUser(this.userId);

    return _.map(collaborationNames, (name) => {
      if (name.indexOf("@") === -1) {
        // if it's a collaboration name...
        let collab = Collaborations.findOne({ name }, {
          fields: {
            name: 1,
            description: 1,
          }
        });

        collab.id = collab.name;
        collab.title = collab.name;
        delete collab.name;
        collab.type = "collaboration";

        return collab;
      } else {
        // if it's a personal collaboration...
        let user = Meteor.users.findOne({
          "collaborations.personal": name
        });

        let userDescription = {
          id: user.collaborations.personal,
          _id: user._id,
          type: "user",
          description: user.collaborations.personal,
        };

        // can't assume user.profile is set
        if (user.profile) {
          userDescription.title = user.profile.fullName;
        }

        return userDescription;
      }
    });
  },

  // return a list of description objects for the union
  // of collaborations in multiple objects
  getObjsCollabDescriptions(collectionName, mongoIds, attribute) {
    check(collectionName, String);
    check(mongoIds, [String]);
    check(attribute, String);

    let user = MedBook.ensureUser(this.userId);

    // ensure the attribute is valid
    let allowedAttributes = [
      "collaborations",
      "collaborators",
      "administrators",
    ];
    if (allowedAttributes.indexOf(attribute) === -1) {
      throw new Meteor.Error("invalid-attribute");
    }

    // put all the collab names into this hash map
    let collabNameHash = {};

    MedBook.collections[collectionName].find({
      _id: { $in: mongoIds }
    }, {
      fields: { [ attribute ]: 1 }
    }).forEach((obj) => {
      _.each(obj[attribute], (collabName) => {
        collabNameHash[collabName] = true;
      });
    });

    return Meteor.call("getCollabDescriptions", Object.keys(collabNameHash));
  },
  // refresh the cBioPortal data
  // NOTE: the only security here for now is that they have a MedBook account
  refreshCBioPortalData(args) {
    check(args, new SimpleSchema({
      form_id: { type: String },
      sample_group_id: { type: String },
      patient_form_id: { type: String, optional: true },
    }));

    let user = MedBook.ensureUser(Meteor.userId());
    user.ensureAccess(Forms.findOne(args.form_id));
    user.ensureAccess(SampleGroups.findOne(args.sample_group_id));

    if (args.patient_form_id) {
      user.ensureAccess(Forms.findOne(args.patient_form_id));
    }

    return Jobs.insert({
      name: "UpdateCbioData",
      user_id: user._id,
      args
    });
  },
});

Moko.ensureIndex(Records, {
  "associated_object.mongo_id": 1,
  "associated_object.collection_name": 1,
});
