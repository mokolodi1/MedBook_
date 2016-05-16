Package.describe({
  name: "medbook:primary-collections",
  version: "0.0.19",
  // Brief, one-line summary of the package.
  summary: "Primary collections and schemas for MedBook",
  // URL to the Git repository containing the source code for this package.
  git: "https://github.com/UCSC-MedBook/MedBook-primary-collections",
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: "README.md"
});

// we use mime in Blobs.js but I guess we don't need a version number (??)
// Npm.depends({"mime": "1.2.0"});
// var mime = Meteor.npmRequire("mime");

function addAndExport (api, name) {
  api.addFiles(name + ".js");
  api.export(name);
}

Package.onUse(function(api) {
  api.versionsFrom("1.1.0.3");

  api.use([
    "aldeed:simple-schema@1.3.3",
    "aldeed:collection2@2.3.3",
    "aldeed:autoform@4.2.2 || 5.0.0 || 5.1.2",
    "underscore",
    "medbook:namespace@0.0.2",
  ]);

  api.addFiles("globals.js");

  api.addFiles("Experimental.js");
  api.export("DataSets");
  api.export("Forms");
  api.export("Records");
  addAndExport(api, "Expression3");

  addAndExport(api, "SampleGroups");
  addAndExport(api, "GeneSets");
  addAndExport(api, "GeneSetCollections");

  // utility collections
  addAndExport(api, "Genes");
  addAndExport(api, "Jobs");

  // base collections
  // addAndExport(api, "Samples");


  // addAndExport(api, "Contrasts");

  // genomic base data

  // api.export("Expression2"); // NOTE: deprecated

  // addAndExport(api, "IsoformExpression");
  // api.export("ExpressionIsoform"); // old version of IsoformExpression
  // addAndExport(api, "GeneAnnotation");
  // addAndExport(api, "Mutations");

  // genomic-based collections
  // addAndExport(api, "Signatures");
  // addAndExport(api, "SignatureScores");

  // networks
  // api.addFiles("Networks.js");
  // api.export("Networks");
  // api.export("NetworkElements");
  // api.export("NetworkInteractions");

  // gene sets




  // blobs
  api.use("cfs:gridfs@0.0.33");
  api.use("cfs:standard-packages@0.5.9");
  addAndExport(api, "Blobs");
  api.export("BlobStore", "server");

  // Older stuff below this line

  // api.addFiles("primary_collections.js");
  // api.export("Studies");
  // api.export("Patients");
  // api.export("CohortSignatures");
  // api.export("Mutations");

  api.addFiles("attachToNamespace.js");
});

Package.onTest(function(api) {
  // nope
  // api.use("tinytest");
  // api.addFiles("primary_collections_tests.js");
});
