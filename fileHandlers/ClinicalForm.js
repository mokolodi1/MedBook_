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
    if (this.wranglerPeek) {
      this.recordCount = 0;

      // NOTE: also defined when `wranglerPeek = false`
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
      // NOTE: also defined when `wranglerPeek = true`
      this.fields = _.map(brokenTabs, function (name) {
        var wranglerDoc = WranglerDocuments.findOne({
          submission_id: this.submission._id,
          document_type: "field_definition"
        });

        return {
          name: name,
          value_type: wranglerDoc.contents.value_type,
        };
      }, this);

      var user = Meteor.users.findOne(this.wranglerFile.user_id);

      var name = this.wranglerFile.options.form_name;
      var sample_label_field = this.wranglerFile.options.sample_label_field;
      if (!sample_label_field) {
        throw "Sample field not selected for " + name;
      }

      this.form_id = Forms.insert({
        name: name,
        collaborations: [ user.collaborations.personal ],
        sample_label_field: sample_label_field,
        fields: this.fields
      });

      this.bulk = Records.rawCollection().initializeUnorderedBulkOp();
      this.bulkCount = 0;
    }
  } else {
    // parse a data line

    if (this.wranglerPeek) {
      this.recordCount++;
    } else {
      var record = _.reduce(this.fields, function (memo, field, index) {
        memo[field.name] = brokenTabs[index];
        return memo;
      }, { form_id: this.form_id });

      // change sample_label_field to include study_label
      var slField = this.wranglerFile.options.sample_label_field;
      var study = Studies.findOne(this.wranglerFile.options.study_id);
      record[slField] = study.study_label + "/" + record[slField];

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
    // execute the last bit of the bulk we've been building up
    if (this.bulkCount > 0) {
      var deferred = Q.defer();
      this.bulk.execute(errorResultResolver(deferred));
      return deferred.promise;
    }
  }
};

WranglerFileHandlers.ClinicalForm = ClinicalForm;
