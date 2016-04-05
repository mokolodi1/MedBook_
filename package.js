Package.describe({
  name: "medbook:primary-collections",
  version: "0.0.17",
  // Brief, one-line summary of the package.
  summary: "Primary collections and schemas for MedBook",
  // URL to the Git repository containing the source code for this package.
  git: "https://github.com/UCSC-MedBook/MedBook-primary-collections",
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: "README.md"
});

function addAndExport (api, name) {
  api.addFiles(name + ".js");
  api.export(name);
}

Package.onUse(function(api) {
  api.versionsFrom("1.1.0.3");

  api.use([
    "aldeed:simple-schema@1.3.3",
    "aldeed:collection2@2.3.3",
    "aldeed:autoform@4.2.2 || 5.0.0",
    "underscore",
    "medbook:namespace@0.0.2",
  ]);

  api.addFiles("globals.js");

  // base collections
  addAndExport(api, "Studies");
  addAndExport(api, "Samples");
  addAndExport(api, "SampleGroups");
  addAndExport(api, "Contrasts");
  addAndExport(api, "CRFs");

  // genomic base data
  addAndExport(api, "GeneExpression"); // NOTE: deprecated
  addAndExport(api, "Expression3");
  api.export("Expression2"); // NOTE: deprecated

  addAndExport(api, "IsoformExpression");
  // api.export("ExpressionIsoform"); // old version of IsoformExpression
  addAndExport(api, "GeneAnnotation");
  addAndExport(api, "Mutations");

  // genomic-based collections
  addAndExport(api, "Signatures");
  addAndExport(api, "SignatureScores");

  // networks
  api.addFiles("Networks.js");
  api.export("Networks");
  api.export("NetworkElements");
  api.export("NetworkInteractions");

  // utility collections
  addAndExport(api, "Genes");
  addAndExport(api, "Jobs");

  // blobs
  api.use("cfs:gridfs@0.0.33");
  api.use("cfs:standard-packages@0.5.9");
  addAndExport(api, "Blobs");
  api.export("BlobStore", "server");

  // Older stuff below this line

  api.addFiles("primary_collections.js");
  api.export("Studies");
  api.export("Patients");
  api.export("CohortSignatures");
  api.export("Mutations");

  api.addFiles("attachToNamespace.js");
});

Package.onTest(function(api) {
  // nope
  api.use("tinytest");
  api.addFiles("primary_collections_tests.js");
});
