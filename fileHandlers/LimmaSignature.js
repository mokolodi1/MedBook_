// TODO: change this to accept options instead of wrangler_file_id
function LimmaSignature (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  this.setSubmissionType.call(this, "signature");
}

LimmaSignature.prototype = Object.create(TabSeperatedFile.prototype);
LimmaSignature.prototype.constructor = LimmaSignature;

LimmaSignature.prototype.parseLine =
    function (brokenTabs, lineNumber, line) {
  if (lineNumber % 1000 === 0) {
    console.log("lineNumber:", lineNumber);
  }

  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  // NOTE: there's no header file, but we want this to happen at the beginning
  if (lineNumber === 1) {
    if (brokenTabs.length !== 7) {
      throw "Expected 7 column tab file, got " + brokenTabs.length +
          " column tab file";
    }

    var signature_label = this.wranglerFile.options.signature_label;
    var existingSignature = Signatures.findOne({
      // TODO: what other criteria is there?
      signature_label: signature_label,
    }, { sort: { signature_version: -1 } });

    var newSignature;
    if (existingSignature) {
      if (this.wranglerFile.options.update_or_create === "create") {
        throw "Signature with that name already exists";
      }

      newSignature = {
        signature_version: existingSignature.signature_version + 1,
        description: existingSignature.description,
        algorithm: existingSignature.algorithm,
        features_type: existingSignature.features_type,
      };
    } else {
      newSignature = {
        signature_version: 1,
        description: this.wranglerFile.options.description,
        algorithm: this.wranglerFile.options.algorithm,
        features_type: this.wranglerFile.options.features_type,
      };

    }

    this.newSignature = _.extend(newSignature, {
      user_id: this.wranglerFile.user_id,
      collaborations: [this.wranglerFile.options.collaboration_label],
      signature_label: signature_label,
      features: [],
    });
  }

  // NOTE: see bottom of this file for more information about column headers
  // from Robert's original limma wrangler code
  validateNumberStrings(brokenTabs.slice(1));
  var feature = {
    feature_label: brokenTabs[0],
    value: brokenTabs[1],
    p_value: brokenTabs[4],
    false_discovery_rate: brokenTabs[5],
  };

  this.newSignature.features.push(feature);

  if (this.wranglerPeek) {
    this.insertWranglerDocument.call(this, {
      document_type: "feature_summary",
      contents: _.extend(feature, {
        signature_label: this.newSignature.signature_label,
        signature_version: this.newSignature.signature_version,
      }),
    });
  }
};

LimmaSignature.prototype.endOfFile = function () {
  if (this.newSignature.features.length === 0) {
    throw "No feature weights defined";
  }

  if (this.wranglerPeek) {
    this.insertWranglerDocument.call(this, {
      document_type: "signature_summary",
      contents: {
        signature_label: this.newSignature.signature_label,
        signature_version: this.newSignature.signature_version,
        description: this.newSignature.description,
        algorithm: this.newSignature.algorithm,
        features_type: this.newSignature.features_type,
      },
    });
  } else {
    Signatures.insert(this.newSignature);
  }
};

WranglerFileTypes.LimmaSignature = LimmaSignature;

// // Copied from Robert's original limma wrangler in RunLimma

// console.log('write signature from Topgene.tab');
// var sig_lines = fs.readFileSync(item, {encoding:'utf8'}).split('\n');
// var colheaders = ['Gene', 'Log Fold Change', 'Avg Expression','T stat','Pval', 'FDR','log odds'];
// 	var count = 0;
// 	var sig_version = Signatures.find({'contrast_id':self.contrast._id}, {'version':1, sort: { version: -1 }}).fetch();
// 	var version = 1;
// var sigArr = [];
// 	try {
// 		version = Number(sig_version[0].version);
// 	}
// 	catch(error) {
// 		version = 1;
// 	}
// 	console.log('previous signature version', version);
// 	version = version + 1;
// 	_.each(sig_lines, function(sig_line) {
// 		var line = sig_line.split('\t');
//
// 	// logFC AveExpr t P.Value adj.P.Val B
// 	gene = line[0];
// 		fc = line[1];
// 		aveExp = line[2];
// 		tStat = line[3];
// 	pVal = line[4];
// 		adjPval = line[5];
// 		Bstat = line[6];
//   probability = Math.exp(Bstat)/(1+Math.exp(Bstat));
// 		if (gene) {
// 			try {
//       if (adjPval < 0.25) {
//         sigArr.push({gene_id:gene, value:fc, p_value:adjPval, probability:probability});
// 					count += 1;
//       }
// 				//if (count < 10) {
// 				//	console.log(gene,fc, sig)
// 					//}
// 			}
// 			catch (error) {
// 				console.log('cannot insert signature for gene', gene, error);
// 			}
// 		}
// })
// if (count == 0) {
//   console.warn("No significant genes found in this contrast");
//   Meteor.call('sendEmail',
//       self.email_address,
//       'MedBook: Limma job complete with warnings',
//       'Warning: No significant genes for this Contrast '+ contrastName+ ' click here for results.');
// }
// else {
//   console.log(count,'significant genes found in this contrast');
//   console.log('insert sig', 'contrast', self.contrast._id, 'version', version, 'name', contrastName, 'length of signature', sigArr.length);
// 		var sigObj = Signatures.insert({
//     'name':contrastName,
//     'studyID': studyID,
//     'label': contrastName,
//     'type': 'differential',
// 			'version':version,
//     'contrast_id':self.contrast._id,
//     'sparse_weights':  sigArr ,
//     'description': 'limma sig',
//     'algorithm': 'limma'
//   },
//     function(err, res_id) {
//       if (err) {
//          console.log('insert error, ', err);
//          Meteor.Error("Cannot insert signature");
//       }
//       console.log('done inserting signature _id=', res_id);
//       Meteor.call('sendEmail',
//         self.email_address,
//         'MedBook: Limma job complete, successfully ',
//         count.toString()+ ' significant genes found for Contrast ', contrastName, 'click here for results.');
//
//       if (sigObj) {
//         output_obj.signature = res_id;
//       }
//   });
// }
