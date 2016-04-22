// TODO: change this to accept options instead of wrangler_file_id
function PatientSampleMapping (wrangler_file_id) {
  TabSeperatedFile.call(this, {
    wrangler_file_id: wrangler_file_id
  });

  // TODO: remove this (?)
  this.setSubmissionType.call(this, "metadata");
}

PatientSampleMapping.prototype = Object.create(TabSeperatedFile.prototype);
PatientSampleMapping.prototype.constructor = PatientSampleMapping;

PatientSampleMapping.prototype.parseLine = function (brokenTabs, lineNumber, line) {
  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  var study = Studies.findOne({id: this.wranglerFile.options.study_label});

  var patient_label = brokenTabs[0];
  var sample_label = brokenTabs[1];

  if (lineNumber === 1) {
    if (!patient_label.match(/patient/i)) {
      throw 'First column header must contain "patient" (not case sensitive)';
    }

    if (!sample_label.match(/sample/i)) {
      throw 'Second column header must contain "sample" (not case sensitive)';
    }

    return;
  }

  var patient = _.findWhere(study.patients, { patient_label: patient_label });

  var wranglerDocUpdate = {
    document_type: "patient_sample_map",
    contents: {
      study_label: study.id,
      patient_label: patient_label,
      sample_label: sample_label,
    },
  };

  if (patient) {
    var sampleExists = false;
    if (patient && patient.sample_labels.indexOf(sample_label) > -1) {
      sampleExists = true;
    }

    if (sampleExists) {
      if (this.wranglerPeek) {
        wranglerDocUpdate.contents.change_description = "patient and sample exist already";
        this.insertWranglerDocument.call(this, wranglerDocUpdate);
      } else {
        // nothing
      }
    } else {
      if (this.wranglerPeek) {
        wranglerDocUpdate.contents.change_description = "adding sample to existing patient";
        this.insertWranglerDocument.call(this, wranglerDocUpdate);
      } else {
        var updated = Studies.update({
          _id: study._id,
          "patients.patient_label": patient_label,
          // remove race condition possibility
          "patients.sample_labels": { $ne: sample_label }
        }, {
          $addToSet: {
            "patients.$.sample_labels": sample_label,
          }
        });

        if (updated !== 1) {
          throw "Two people are trying to do this at the same time. " +
              "Please try again.";
        }
      }
    }
  } else {
    if (this.wranglerPeek) {
      wranglerDocUpdate.contents.change_description = "creating patient and adding sample";
      this.insertWranglerDocument.call(this, wranglerDocUpdate);
    } else {
      var updated = Studies.update({
        _id: study._id,
        // remove race condition possibility
        "patients.patient_label": { $ne: patient_label },
      }, {
        $addToSet: {
          "patients": {
            patient_label: patient_label,
            sample_labels: [ sample_label ],
          },
        }
      });

      if (updated !== 1) {
        throw "Two people are trying to do this at the same time. " +
            "Please try again.";
      }
    }
  }

  // also add to Patient_IDs/Sample_IDs
  if (!this.wranglerPeek) {
    Studies.update(study._id, {
      $addToSet: {
        Patient_IDs: patient_label,
        Sample_IDs: sample_label,
      },
    });
  }
};

WranglerFileTypes.PatientSampleMapping = PatientSampleMapping;
