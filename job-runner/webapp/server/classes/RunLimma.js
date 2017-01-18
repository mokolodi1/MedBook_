function RunLimma (job_id) {
  Job.call(this, job_id);
}
RunLimma.prototype = Object.create(Job.prototype);
RunLimma.prototype.constructor = RunLimma;

RunLimma.prototype.run = function () {
  // create paths for files on the disk
  var workDir = ntemp.mkdirSync("UpDownGenes");
  console.log("workDir: ", workDir);

  // create a sample group which is the combination of the two sample groups
  // so that we can easily write out a file

  var args = this.job.args;
  var experimental =
      SampleGroups.findOne(args.experimental_sample_group_id);
  var reference =
      SampleGroups.findOne(args.reference_sample_group_id);

  // combine samples of same data set into single array
  var dataSetHash = {};
  _.each(experimental.data_sets.concat(reference.data_sets),
      function (dataSet) {
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
        seenAlready.sample_labels.concat(dataSet.sample_labels);
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

  var comboSampleGroupId = SampleGroups.insert({
    name: "temp - created in RunLimma to call an adapter",
    version: 1,
    data_sets: comboSampleGroupDataSets,
    value_type: experimental.value_type,

    // invisible
    collaborations: [],
  });

  // start the promise chain: woohoo!

  var self = this;
  var deferred = Q.defer();

  // define the limma output files
  var modelFitPath = path.join(workDir, "model_fit.tab");
  var voomPlotPath = path.join(workDir, "mds.pdf");
  var topGenePath = path.join(workDir, "top_genes.rnk");

  // define this up here so we can pass data between the .thens
  var limmaResultPass;

  // write out the data for use in limma
  Q.all([
      spawnCommand(getSetting("genomic_expression_export"), [
        "--sample_group_id", comboSampleGroupId,
      ], workDir),

      // phenotype file
      spawnCommand(getSetting("limma_phenotype_export"), [
        args.reference_sample_group_id,
        args.experimental_sample_group_id
      ], workDir),
    ])
    .spread(function (genomicExpSpawn, limmaPhenoSpawn) {
      if (genomicExpSpawn.exitCode !== 0 || limmaPhenoSpawn.exitCode !== 0) {
        throw "Problem writing files to disk.";
      }

      // run limma
      return spawnCommand("Rscript", [
        getSetting("limma_path"),
        genomicExpSpawn.stdoutPath,
        limmaPhenoSpawn.stdoutPath,
        self.job.args.top_genes_count,

        // "BH" or "none"
        // TODO: make this an argument for the job?
        "BH",
        modelFitPath,
        topGenePath,
        voomPlotPath,
      ], workDir);
    })
    .then(function (limmaResult) {
      limmaResultPass = limmaResult;

      // We can only have one bindEnvironment, so deal with any possible
      // limma problems down below. Only run the gene set import if limma
      // exited successfully.
      if (limmaResult.exitCode === 0) {
        // insert the gene set created by Limma
        return spawnCommand(getSetting("gene_set_import"), [
          topGenePath,
          "Limma: " + args.reference_sample_group_name +
              "(v" + args.reference_sample_group_version + ")" +
              " vs. " + args.experimental_sample_group_name +
              "(v" + args.experimental_sample_group_version + ")",
          "Biocondoctor's limma package with a top genes count of " +
              args.top_genes_count,
          "GeneID",

          // security
          // NOTE: need to put everything in single quotes to stop it
          // from splitting into two args at the comma
          '\'{"collection_name":"Jobs","mongo_id":"' + self.job._id + '"}\'',

          "--fieldDefinitions",
          "GeneID", "String",
          "Log_Fold_Change", "Number",
          "Expression_Mean", "Number",
          "t_Score", "Number",
          "P_Value", "Number",
          "Adjusted_P_Value", "Number",
          "B_Statistic_Log_Odds", "Number",
        ], workDir);
      }
    })
    .then(Meteor.bindEnvironment(function (createGeneSetSpawn) {
      if (limmaResultPass.exitCode !== 0) {
        // insert the stdout and stderr files from GSEA
        // NOTE: blobs are created asyncronously

        let associated = {
          collection_name: "Jobs",
          mongo_id: self.job._id,
        };

        Q.all([
          Blobs2.create(limmaResultPass.stdoutPath, associated, {}),
          Blobs2.create(limmaResultPass.stderrPath, associated, {}),
        ]).catch(function (error) {
          console.log("Error adding error blobs for Limma:", error);
        });

        throw "Problem running Limma";
      }

      if (createGeneSetSpawn.exitCode !== 0) {
        throw "Problem creating gene set from limma result";
      }

      // remove the temporary sample group (also do this if it fails)
      // Do this down here because I don't feel like wrapping another .then
      // in a callback.
      SampleGroups.remove(comboSampleGroupId);

      // add the two PDF blobs
      var associatedObj = {
        collection_name: "Jobs",
        mongo_id: self.job._id,
      };

      // TODO: name this file something better?
      var rPlotsDefer = Q.defer();
      Blobs2.create(path.join(workDir, "Rplots.pdf"), associatedObj, {},
          errorResultResolver(rPlotsDefer));

      var voomPlotDefer = Q.defer();
      Blobs2.create(voomPlotPath, associatedObj, {},
          errorResultResolver(voomPlotDefer));

      // wait until they're done being added and then resolve the job
      Q.all([rPlotsDefer.promise, voomPlotDefer.promise])
        .then(function (values) {
          deferred.resolve({});
        })
        .catch(deferred.reject);
    }, deferred.reject))
    .catch(Meteor.bindEnvironment(function (reason) {
      // always remove the created sample group even if it fails
      SampleGroups.remove(comboSampleGroupId);

      deferred.reject(reason);
    }, deferred.reject));
  return deferred.promise;
};

RunLimma.prototype.onSuccess = function () {
  Notifications.insert({
    user_id: this.job.user_id,
    href: `/tools/limma/${this.job._id}`,
    content: "<b>Limma</b> has finished for " +
        `<b>${this.job.args.reference_sample_group_name}</b> vs. ` +
        `<b>${this.job.args.experimental_sample_group_name}</b>`,
  });
};

RunLimma.prototype.onError = function (reason) {
  let { job } = this;
  let content = "Failed to run <b>Limma</b> for " +
      `<b>${job.args.reference_sample_group_name}</b> vs. ` +
      `<b>${job.args.experimental_sample_group_name}</b>: `;

  if (typeof reason === "string") {
    content += reason;
  } else {
    content += "Internal error";
  }

  Notifications.insert({
    user_id: job.user_id,
    href: `/tools/limma/${job._id}`,
    content,
  });
};

JobClasses.RunLimma = RunLimma;
