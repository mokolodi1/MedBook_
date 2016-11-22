function UpdateCbioData(job_id) {
  console.log('run UpdateCbioData', this, 'job', job_id);
  Job.call(this, job_id);
  // UpdateCbioData
  // args
  //  sample_group_id - samples with expression and clinical data for upload into cbio
}
UpdateCbioData.prototype = Object.create(Job.prototype);
UpdateCbioData.prototype.constructor = UpdateCbioData;

UpdateCbioData.prototype.run = function () {
  // create paths for files on the disk
  // Use temporary folders at /tmp/UpdateCbioData[job_id]

  var workDir = "/tmp/" + "UpdateCbioData_" + this.job._id;

  try {
    fs.mkdirSync(workDir);
  } catch (e) {
    console.log("Pretty sure you reran the job: {$set: { status: 'waiting' }}");
    console.log("error:", e);
    throw e;
  }

  console.log("workDir: ", workDir);

  // look up datasetName using sample_group
  var group = SampleGroups.findOne(this.job.args.sample_group_id);
  var dataSetHash = {};
  var dataSetName = "";
  _.each(group.data_sets, function (dataSet) {
    // check if we've seen this data set already
    var seenAlready = dataSetHash[dataSet.data_set_id];
    if (!seenAlready) {
      // if we haven't, set it up
      dataSetName = dataSet.data_set_name;
      seenAlready = {
        data_set_name: dataSet.data_set_name,
        sample_labels: [],
      };
    }
    // combine the samples together
    seenAlready.sample_labels =
        seenAlready.sample_labels.concat(dataSet.sample_labels)
    dataSetHash[dataSet.data_set_id] = seenAlready;
  });
  var comboSampleGroupDataSets = _.map(dataSetHash,
      function (samplesAndName, data_set_id) {
    return {
      data_set_id: data_set_id,
      data_set_name: samplesAndName.data_set_name,
      sample_labels: samplesAndName.sample_labels,

      // I think we can fake this
      unfiltered_sample_count: 1,
    };
  });




  var self = this;
  var deferred = Q.defer();

  // define up here so as to be available throughout promise chain (so that
  // we can skip a .then block)
  var expressionDataPath = path.join(workDir, "data_expression.txt");
  var logPath = path.join(workDir, "*.log");
  var associated_object = {
    collection_name: "SampleGroups",
    mongo_id: this.job.args.sample_group_id,
  };
  var patient_form_id = "";
  if (this.job.args.patient_form_id) {
    patient_form_id = this.job.args.patient_form_id;
  }
  var clin_cmd = [
    "--sample_group_id",
    this.job.args.sample_group_id,
    "--form_id",
    this.job.args.form_id,
    "--work-dir",
    workDir
  ];
  if (patient_form_id != "") {
    clin_cmd.push("--patient_form_id");
    clin_cmd.push(patient_form_id);
  }

  Q.all([
      // write mongo data to files

      // expression data to a file for use in Limma
      spawnCommand(getSetting("genomic_expression_export"), [
        "--sample_group_id", this.job.args.sample_group_id,
        "--cbio",
        "--uq-sample-labels",
      ], workDir, { stdoutPath: expressionDataPath }),
      // phenotype file for cbio importer
      spawnCommand(getSetting("clinical_export"), clin_cmd, workDir),
    ])
    .then(function (spawnResults)           {
      console.log("done writing files");

      _.each(spawnResults, function (result) {
        if (result.exitCode !== 0) {
          throw "Problem writing files to disk.";
        }
      });

      // save the file paths... order maters for spawnResults
      // (the order depends on the order of `spawnCommand`s in `Q.all`)
      var clinicalPath = spawnResults[1].stdoutPath;

      // run CbioImporter
      return spawnCommand(getSetting("cbio_importer_path"), [
        "-c import-study",
        "-jar",
        getSetting("cbio_core_jar_path"),
        "-s",
        workDir,
      ], workDir );
    })
    .then(Meteor.bindEnvironment(function (cbioImportResult) {
      if (cbioImportResult.exitCode !== 0) {
        throw "Problem running cbio importer";
      }
      let associatedObj = {
        collection_name: "Jobs",
        mongo_id: self.job._id,
      };
      console.log("associatedObj:", associatedObj); // XXX

      Blobs2.create(cbioImportResult.stdoutPath, associatedObj, {}, (error) => {
        if (error) {
          console.log("Error creating cBioPortal stdout");
          deferred.reject(error);
        } else {
          deferred.resolve();
        }
      });
    }, deferred.reject))
    .catch(deferred.reject);
  return deferred.promise;
};

JobClasses.UpdateCbioData = UpdateCbioData;
