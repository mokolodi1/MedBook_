# MedBook-JobRunner

### CBioUpdateData (`UpdateCbioData`)

Import data into local copy of cBioPortal.

This job exports data from mongo and runs Java code from cbioportal.org to load expression data clinical data from MedBook to cBioPortal.

#### Arguments
- `sample_group_id`: id of the sample group that defines which expression data will be loaded
- `form_id`: id of the clinical form for sample level data, sample_labels in this form must match sample labels from the sample_group defined above.
- `patient_form_id`: id of the clinical form with patient level attributes.

[See here for Cbioportal importer tool documentation](https://cbioportal.readthedocs.io/en/latest/#data-loading).

#### Output

Creates a log file of the resulting run and stores it in a blob in mongo.

## Runs and monitors Jobs (Current UNIX processes, Galaxy and other Environments coming)
### steps to adding a new tools

1. create a feature branch in git
2. look at https://github.com/UCSC-MedBook/MedBook-JobRunner/blob/f-gsea-new/webapp/server/classes/RunLimmaGSEA.js
3. create a new class
4. Add new class and its args to primary-collections repo collections/Jobs.js
4. add adapters (importers and exporters) to convert from MedBook objects to files that tools understand and store check them into external-tools
4. add external code to external-tools repo (or mechanism to install it)
5. add pointers to external code in your personal settings.json for use while testing
  - also add these pointers in the MedBook main repo docker-compose.yml METEOR_SETTINGS environment variable
6. add gui to appropriate MedBook app, that initiates job by inserting into jobs collection
  for example:
   Jobs.insert({
      name: "UpDownGenes",
      status: "waiting",
      user_id: user._id,
      collaborations: [ user.personalCollaboration() ],
      args
    });
7. read errors from jobs.error_description
