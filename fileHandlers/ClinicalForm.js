// TODO: change this to accept options instead of wrangler_file_id
function ClinicalForm (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  // TODO: remove this (?)
  this.setSubmissionType.call(this, "clinical");
}

ClinicalForm.prototype = Object.create(TabSeperatedFile.prototype);
ClinicalForm.prototype.constructor = ClinicalForm;

ClinicalForm.prototype.parseLine = function (brokenTabs, lineNumber, line) {
  // initialize stuff at the beginning
  if (lineNumber === 1) {
    // keep track of this to be put into the Forms object
    this.sample_labels = [];

    if (this.wranglerPeek) {
      // keep track of this seperately because we don't keep
      // a list of sample_labels if they haven't set sample_label_field
      // yet
      this.recordCount = 0;

      // NOTE: defined differently when `wranglerPeek = false`
      this.fields = _.map(brokenTabs, function (name) {
        return {
          name: name,
          value_type: "String",
        };
      });

      // make sure there are no duplicate field names
      // TODO: display the field name
      if (_.uniq(brokenTabs).length !== brokenTabs.length) {
        throw "Duplicate field name!";
      }
    } else {
      // use what was set in the WranglerDocuments
      // ==> This allows us to have the user select a different type
      //     and also means we can do everything at once instead of setting
      //     the `value_type`s at the end, which is annoying.
      // NOTE: defined differently when `wranglerPeek = true`
      this.fields = _.map(brokenTabs, function (name) {
        var wranglerDoc = WranglerDocuments.findOne({
          submission_id: this.submission._id,
          document_type: "field_definition",
          "contents.field_name": name,
        });

        return {
          name: name,
          value_type: wranglerDoc.contents.value_type,
        };
      }, this);

      var name = this.wranglerFile.options.form_name;
      var sample_label_field = this.wranglerFile.options.sample_label_field;
      var possibleHeaderNames = this.wranglerFile.info.header_names;

      // make sure the sample label field is set and is valid
      if (!sample_label_field ||
          possibleHeaderNames.indexOf(sample_label_field) === -1) {
        throw "Sample field not selected for " + name;
      }

      this.form_id = Forms.insert({
        name: name,
        sample_label_field: sample_label_field,
        fields: this.fields,

        // keep collaborations blank for now so they can't see it
        collaborations: [],

        // update these at the end when once we've collected the info
        sample_labels: [],
        sample_count: 0,
      });

      this.bulk = Records.rawCollection().initializeUnorderedBulkOp();
      this.bulkCount = 0;
    }

    // grab the study to be used every line
    this.study = Studies.findOne(this.wranglerFile.options.study_id);

    // add the header names to the wrangler file if they don't exist already
    if ((!this.wranglerFile.info || _.isEqual(this.wranglerFile.info, {}))
        || !this.wranglerFile.info.header_names) {
      WranglerFiles.update(this.wranglerFile._id, {
        $set: {
          info: {
            header_names: _.pluck(this.fields, "name")
          }
        }
      });
    }
  } else {
    // parse a data line

    var record = _.reduce(this.fields, function (memo, field, index) {
      memo[field.name] = brokenTabs[index];
      return memo;
    }, {
      associated_object: {
        collection_name: "Forms",
        mongo_id: this.form_id
      }
    });

    // change sample_label_field to include study_label
    var slField = this.wranglerFile.options.sample_label_field;

    // We can only check if the samples are valid once the user has selected
    // the sample_label_column. Once they do that, we run ParseWranglerFile
    // again before SubmitWranglerFile, which will run this code.
    if (slField) {
      var sample_label = this.study.study_label + "/" + record[slField];

      // make sure the sample label is in the study
      if (this.study.sample_labels.indexOf(sample_label) === -1) {
        throw "Sample " + sample_label + " not defined in study.";
      }

      // change the record's sample label and add to the list of sample labels
      record[slField] = sample_label;
      this.sample_labels.push(sample_label);
    }

    // validate the record
    MedBook.validateRecord(record, this.fields);

    if (this.wranglerPeek) {
      this.recordCount++;
    } else {
      // add to the bulk to be inserted
      this.bulk.insert(record);
      this.bulkCount++;

      // if the bulk is big enough, insert everything
      if (this.bulkCount > 500) {
        console.log("lineNumber:", lineNumber);

        // switch out the bulk for a new one
        // TODO: is there a concurrency issue here?
        var lastBulk = this.bulk;
        this.bulk = Records.rawCollection().initializeUnorderedBulkOp();
        this.bulkCount = 0;

        // insert the last bulk
        var deferred = Q.defer();
        lastBulk.execute(errorResultResolver(deferred));
        return deferred.promise;
      }
    }
  }
};

ClinicalForm.prototype.endOfFile = function () {
  if (this.wranglerPeek) {
    this.insertWranglerDocument.call(this, {
      document_type: "form_definition",
      contents: {
        form_name: this.wranglerFile.options.form_name,
        record_count: this.recordCount,
      }
    });

    _.each(this.fields, function (field) {
      this.insertWranglerDocument.call(this, {
        document_type: "field_definition",
        contents: {
          form_name: this.wranglerFile.options.form_name,
          field_name: field.name,
          value_type: field.value_type,
        }
      });
    }, this);
  } else {
    // call this usually after having run this.bulk.execute()
    var self = this;
    function makeFormAvailable() {
      var user = Meteor.users.findOne(self.wranglerFile.user_id);

      var deferred = Q.defer();

      // use Forms.rawCollection because SimpleSchema hands when
      // arrays are very large (10,000+ elements)
      Forms.rawCollection().update({_id: self.form_id }, {
        $set: {
          collaborations: [ user.collaborations.personal ],
          sample_labels: self.sample_labels,
          sample_count: self.sample_labels.length,
        }
      }, function (error, result) {
        if (error) { deferred.reject(error); }
        else { deferred.resolve(); }
      });

      return deferred.promise;
    }

    // execute the last bit of the bulk we've been building up
    if (this.bulkCount > 0) {
      var deferred = Q.defer();

      this.bulk.execute(Meteor.bindEnvironment(function (err, res) {
        if (err) {
          deferred.reject(err);
        } else {
          makeFormAvailable()
            .then(deferred.resolve)
            .catch(deferred.reject);
        }
      }, deferred.reject));

      return deferred.promise;
    } else {
      return makeFormAvailable();
    }
  }
};

WranglerFileHandlers.ClinicalForm = ClinicalForm;
