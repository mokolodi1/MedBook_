function MutationVCF (wrangler_file_id, isSimulation) {
  FileHandler.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  this.setSubmissionType.call(this, "mutation");
}
MutationVCF.prototype = Object.create(FileHandler.prototype);
MutationVCF.prototype.constructor = MutationVCF;

// TODO: change object model to remove this function
function setHighLevel(highLevelObject, key, newValue) {
  if (highLevelObject[key] === undefined) {
    highLevelObject[key] = newValue;
  } else {
    // only complain if not the same
    if (highLevelObject[key] !== newValue) {
      // specifically for effect_impact: MODIFIER mixes with LOW
      if (key === "effect_impact") {
        if (newValue === "MODIFIER") {
          // don't do anything for right now...
        } else if (highLevelObject[key] === "MODIFIER") {
          highLevelObject[key] = newValue;
        } else {
          if (newValue === "HIGH" ||
              (newValue === "MODERATE" && highLevelObject[key] === "LOW")) {
            highLevelObject[key] = newValue;
          } else {
            // console.log("two different values for effect_impact in same mutationDoc, even with the LOW/MODIFIER code:",
            //     highLevelObject[key], newValue);
          }
        }
      } else {
        // console.log("two different values for " + key + " in same mutationDoc:",
        //     highLevelObject[key], newValue, "(using second)");
        highLevelObject[key] = newValue;
      }
    }
  }
}
MutationVCF.prototype.parse = function () {
  var self = this;

  // NOTE: one of these is not used at the end, depending on whether
  // this.wranglerPeek is true.
  var mutation_count = 0;
  var mutationBulk = Mutations.rawCollection().initializeUnorderedBulkOp();

  return Q.Promise(function (resolve, reject) {
    self.blobAsString()
      .then(Meteor.bindEnvironment(function (blobText) {
        var data;
        try {
          data = ParseVCF(blobText);
        } catch (error) {
          reject("Error parsing .vcf file");
        }

        // TODO: pull from the sampleNames in the header
        // var possibleSampleLabel = record.__HEADER__.sampleNames[0];
        // if (possibleSampleLabel !== "ion-sample") {
        //   console.log("possibleSampleLabel:", possibleSampleLabel);
        //   mutationDoc.sample_label = possibleSampleLabel;
        // } else {
        //
        // }

        var sampleLabel = Wrangler.wrangleSampleLabel(self.blob.original.name);
        if (!sampleLabel) {
          throw "Could not parse sample label from file name";
        }

        for (var recordIndex in data.records) {
          var record = data.records[recordIndex];

          var mutationDoc = {
            "sample_label": sampleLabel,
          };

          var directMappings = {
            "REF": "reference_allele",
            "ALT": "variant_allele",
            "CHROM": "chromosome",
            "POS": "start_position",
          };

          for (var key in record) {
            var value = record[key];

            if (directMappings[key] !== undefined) {
              mutationDoc[directMappings[key]] = value;
            } else {
              if (key === "INFO") {
                for (var infoKey in value) {
                  var infoValue = value[infoKey];
                  if (infoKey === "EFF") {
                    var effArray = infoValue.split(",");
                    for (var effectIndex in effArray) {
                      // ex. for efffects[effectIndex]
                      // NON_SYNONYMOUS_CODING(MODERATE|MISSENSE|gaC/gaG|D1529E|1620|ALK|protein_coding|CODING|ENST00000389048|29|1)
                      var split = effArray[effectIndex].split("(");
                      var effectDescription = split[0]; // ex. NON_SYNONYMOUS_CODING
                      var effectArray = split[1]
                          .substring(0, split[1].length - 1) // remove trailing ')'
                          .split("|");
                      // console.log('eff array ', effectArray);
                      var effectAttributes = [
                        "Effect_Impact",
                        "Functional_Class",
                        "Codon_Change",
                        "Amino_Acid_change",
                        "Amino_Acid_length",
                        "Gene_Name",
                        "Transcript_BioType",
                        "Gene_Coding",
                        "Transcript_ID",
                        "Exon",
                        "GenotypeNum",
                        "ERRORS",
                        "WARNINGS",
                      ];
                      var effects = {};
                      // TODO: change to _.mapObject
                      for (var attributeIndex in effectAttributes) {
                        effects[effectAttributes[attributeIndex]] =
                            effectArray[attributeIndex];
                      }
                      setHighLevel(mutationDoc, "gene_label", effects.Gene_Name);
                      setHighLevel(mutationDoc, "protein_change", effects.Amino_Acid_change);
                      setHighLevel(mutationDoc, "effect_impact", effects.Effect_Impact);
                      setHighLevel(mutationDoc, "functional_class", effects.Functional_Class);
                      setHighLevel(mutationDoc, "genotype", effects.GenometypeNum);
                      // console.log("effects:", effects);

                    }
                  } else if (infoKey === "TYPE") {
                    setHighLevel(mutationDoc, "mutation_type", infoValue);
                  } else if (infoKey === "DP") {
                    setHighLevel(mutationDoc, "read_depth", infoValue);
                  } else {
                    // console.log("unknown key in INFO:", infoKey);
                  }
                }
              } else {
                // console.log("unknown attribute:", attribute);
              }
            }
          }

          /*
          ** get things from other places if not set already
          */

          // grab sample_label from file name if needed
          if (mutationDoc.mutation_type === undefined) {
            mutationDoc.mutation_type = "snp";
          }
          if (mutationDoc.start_position !== undefined &&
              mutationDoc.mutation_type === "snp") {
            // TODO: hardcoded
            mutationDoc.end_position = mutationDoc.start_position + 1;
          }

          if (mutationDoc.effect_impact && mutationDoc.effect_impact === "LOW") {
            // console.log("not adding low impact mutation...");
          } else {
            // actually add to the collection/add a doc

            mutation_count++;
            if (!self.wranglerPeek) {
              _.extend(mutationDoc, {
                study_label: self.submission.options.study_label,
                collaboration_label: self.submission.options.collaboration_label,
                biological_source: self.submission.options.biological_source,
                mutation_caller: self.submission.options.mutation_caller,
                mutation_impact_assessor: self.submission.options.mutation_impact_assessor,
              });

              mutationBulk.insert(mutationDoc);
            }
          }
        }

        console.log("before wranglerPeek split");

        if (self.wranglerPeek) {
          self.insertWranglerDocument.call(self, {
            document_type: "mutation_summary",
            contents: {
              sample_label: sampleLabel,
              mutation_count: mutation_count,
            },
          });

          resolve();
        } else {
          console.log("execute bulk");
          mutationBulk.execute(function (error, result) {
            if (error) {
              reject(error);
            } else {
              resolve({});
            }
          });
        }
      }, reject));
  });
};

WranglerFileTypes.MutationVCF = MutationVCF;
