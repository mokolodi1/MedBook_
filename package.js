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
  api.addFiles("collections/" + name + ".js");
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
    "matb33:collection-hooks@0.8.1",
  ]);

  api.addFiles("globals.js");

  addAndExport(api, "Studies");
  addAndExport(api, "DataSets");
  addAndExport(api, "GenomicExpression");
  addAndExport(api, "Forms");
  addAndExport(api, "Records");
  addAndExport(api, "SampleGroups");

  addAndExport(api, "GeneSets");
  addAndExport(api, "GeneSetCollections");

  // utility collections
  addAndExport(api, "Jobs");

  api.addFiles("attachToNamespace.js");
});

Package.onTest(function(api) {
  // nope
  // api.use("tinytest");
  // api.addFiles("primary_collections_tests.js");
});
