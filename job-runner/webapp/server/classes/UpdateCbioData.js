function UpdateCbioData(job_id) {
  console.log('run UpdateCbioData', this, 'job', job_id)
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
  console.log('workdir',workDir)

  try {
    fs.mkdirSync(workDir);
  } catch (e) {
    console.log("Pretty sure you reran the job: {$set: { status: 'waiting' }}");
    console.log("error:", e);
    throw e;
  }

  console.log("workDir: ", workDir);

  // create a sample group which is the combination of the two sample groups
  // so that we can easily write out a file

  var group = SampleGroups.findOne(this.job.args.sample_group_id);

  // combine samples of same data set into single array
  var dataSetHash = {};
  _.each(group.data_sets, function (dataSet) {
    // check if we've seen this data set already
    var seenAlready = dataSetHash[dataSet.data_set_id];
    if (!seenAlready) {
      // if we haven't, set it up
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

  //var comboSampleGroupId = SampleGroups.insert({
  //  name: "temp - created in UpdateCbioData to call an adapter",
  //  version: 1,
  //  data_sets: comboSampleGroupDataSets,
  //  value_type: group.value_type,

    // invisible
  //  collaborations: [],
  //});

  // star the promise chain: woohoo!

  var self = this;
  var deferred = Q.defer();

  // define up here so as to be available throughout promise chain (so that
  // we can skip a .then block)
  var geneSetGroupPath;

  Q.all([
      // write mongo data to files

      // expression data to a file for use in Limma
      spawnCommand(getSetting("genomic_expression_export"), [
        "--sample_group_id", group._id,
      ], workDir),
      // phenotype file for Limma
      spawnCommand(getSetting("clinical_export"), [
        this.job.args.sample_group_id,
      ], workDir),
      // gene sets file for GSEA
      //spawnCommand(getSetting("gene_set_group_export"), [
      //  self.job.args.gene_set_group_id,
      //], workDir, { stdoutPath: geneSetGroupPath }),
    ])
    .then(function (spawnResults) {
      console.log("done writing files");

      _.each(spawnResults, function (result) {
        if (result.exitCode !== 0) {
          throw "Problem writing files to disk.";
        }
      });

      // save the file paths... order maters for spawnResults
      // (the order depends on the order of `spawnCommand`s in `Q.all`)
      var expressionDataPath = spawnResults[0].stdoutPath;
      var clinicalPath = spawnResults[1].stdoutPath;

      // run CbioImporter
      return spawnCommand("java", [
        getSetting("cbio_importer_path"),
        expressionDataPath,
        clinicalPath,
      ], workDir);
    })
    .then(function (cbioImportResult) {
      if (cbioImportResult.exitCode !== 0) {
        throw "Problem running cbio importer";
      }

      // "F" is to put a "/" at the end of every folder name
      return spawnCommand("ls", [ "-1F", expressionDataPath ], workDir);
    })
    // can't add another .then: Meteor.bindEnvironment returns immidiately
    .then(Meteor.bindEnvironment(function (result) {

      // use the ls result to insert all of the blobs
      var outputString = fs.readFileSync(result.stdoutPath, "utf8");
      var outputFileNames = _.filter(outputString.split("\n"),
          function (fileName) {
        return !!fileName && fileName.slice(-1) !== "/";
      });

    }, deferred.reject))
    .catch(Meteor.bindEnvironment(function (reason) {

      deferred.reject(reason);
    }, deferred.reject));
  return deferred.promise;
};

JobClasses.UpdateCbioData = UpdateCbioData;
